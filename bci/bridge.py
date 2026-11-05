"""NeuroHand EEG bridge.

Runs on the computer the headset is connected to. It reads EEG, talks to the
NeuroHand website over a WebSocket (ws://localhost:8765), and:

  * Calibration: saves a labelled EEG trial for every cue the website shows,
    then trains the left/right model when calibration ends.
  * Training sessions: classifies the last 2 s of EEG ten times a second and
    sends the left/right probability to the website, which moves the hand.

Start it with one of:
    python bridge.py --source synthetic   # fake EEG for testing, no headset
    python bridge.py --source chords      # NPG Lite: start Chords first (it streams over LSL)
    python bridge.py --source lsl         # any other headset that streams over Lab Streaming Layer
    python bridge.py --source custom      # your headset's own code (edit CustomSource below)

Only the Python standard library plus numpy, scipy and scikit-learn are needed.
"""
import argparse
import asyncio
import base64
import glob
import hashlib
import json
import os
import struct
import sys
import time
from datetime import datetime

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bci_core import WINDOW_S, MotorImageryModel, signal_quality, train  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
MODEL_PATH = os.path.join(HERE, "models", "model.pkl")
EPOCH_START_S, EPOCH_LEN_S = 0.5, 3.0   # use 0.5-3.5 s after the "imagine" cue
DEFAULT_CHANNELS = ["C3", "Cz", "C4"]


# --------------------------------------------------------------------------- sources
class SyntheticSource:
    """Fake EEG that reacts to the website's cues, for testing without a headset.

    Each channel is background noise plus a 10 Hz mu rhythm. When the website
    asks for left-hand imagery, the mu rhythm over C4 drops; right hand drops C3.
    About 1 trial in 5 has no drop, like a real person on an off moment.
    """

    def __init__(self, state, fs=250, channels=DEFAULT_CHANNELS, success_rate=0.8, seed=None):
        self.fs, self.channels, self.state = fs, list(channels), state
        self.rng = np.random.default_rng(seed)
        self.success_rate = success_rate
        self.t = 0
        self.last = time.monotonic()
        self.phase = self.rng.uniform(0, 2 * np.pi, len(self.channels))
        self.noise_state = np.zeros(len(self.channels))
        self._trial_id, self._success = None, True

    def read(self):
        now = time.monotonic()
        n = int((now - self.last) * self.fs)
        if n <= 0:
            return None
        self.last += n / self.fs
        if self.state.trial_id != self._trial_id:
            self._trial_id = self.state.trial_id
            self._success = self.rng.random() < self.success_rate
        amp = np.full(len(self.channels), 12.0)
        if self.state.imagining and self._success:
            target = "C4" if self.state.cue == "left" else "C3"
            if target in self.channels:
                amp[self.channels.index(target)] *= 0.35
        tt = (self.t + np.arange(n)) / self.fs
        out = np.empty((len(self.channels), n))
        for c in range(len(self.channels)):
            # Brown-ish background noise plus the mu rhythm
            white = self.rng.normal(0, 6.0, n)
            noise = np.empty(n)
            v = self.noise_state[c]
            for i in range(n):
                v = 0.9 * v + white[i]
                noise[i] = v
            self.noise_state[c] = v
            self.phase[c] += self.rng.normal(0, 0.05)
            out[c] = noise * 0.4 + amp[c] * np.sin(2 * np.pi * 10 * tt + self.phase[c])
        self.t += n
        return out


class LSLSource:
    """A headset that streams over Lab Streaming Layer.

    Works with Upside Down Labs Chords (NPG Lite): its stream is called
    "BioAmpDataStream", has type "EXG", 500 Hz, no channel names, and sends
    raw 12-bit ADC numbers. Channels without names are taken in order:
    channel 1 = C3, channel 2 = Cz, channel 3 = C4 (change with --pick).
    """

    def __init__(self, state, channels=DEFAULT_CHANNELS, pick=None):
        try:
            from pylsl import StreamInlet, resolve_streams
        except ImportError:
            sys.exit("pylsl is not installed. Run: pip install pylsl")
        print("Looking for an EEG stream (EEG / EXG / Chords BioAmpDataStream)...")
        stream, deadline = None, time.monotonic() + 15
        while stream is None and time.monotonic() < deadline:
            found = resolve_streams(2.0)
            for want in ("EEG", "EXG"):
                stream = stream or next((s for s in found if s.type().upper() == want), None)
            stream = stream or next((s for s in found if "BIOAMP" in s.name().upper()), None)
        if stream is None:
            sys.exit("No EEG stream found. Start Chords first, for example:\n"
                     "  python -m chordspy.connection --protocol ble")
        self.inlet = StreamInlet(stream)
        info = self.inlet.info()
        self.fs = int(round(info.nominal_srate()))
        n = info.channel_count()
        names, ch = [], info.desc().child("channels").child("channel")
        for _ in range(n):
            names.append((ch.child_value("label") or "").strip())
            ch = ch.next_sibling()
        bits = info.desc().child("resinfo").child_value("resolution")
        self.adc_max = (2 ** int(bits) - 1) if bits.isdigit() else None

        want = [c.upper() for c in channels]
        labelled = [n_.upper() for n_ in names]
        if pick:
            self.idx = [p - 1 for p in pick]
        elif all(w in labelled for w in want):
            self.idx = [labelled.index(w) for w in want]
        else:
            self.idx = list(range(len(channels)))
            print("The stream has no channel names, so channels %s are used as %s."
                  % (", ".join(str(i + 1) for i in self.idx), ", ".join(channels)))
            print("Connect the electrodes in that order, or choose others with --pick, e.g. --pick 1,2,3")
        if max(self.idx) >= n:
            sys.exit("The stream has %d channels; --pick asked for channel %d." % (n, max(self.idx) + 1))
        self.channels = list(channels)
        units = "raw ADC values (%s-bit)" % bits if self.adc_max else "microvolts"
        print("Connected to '%s' (%s): %d channels at %d Hz, %s"
              % (info.name(), info.type(), n, self.fs, units))

    def read(self):
        chunk, _ = self.inlet.pull_chunk(timeout=0.0, max_samples=4096)
        if not chunk:
            return None
        return np.asarray(chunk, dtype=float).T[self.idx]


class CustomSource:
    """Plug in the code that came with your headset here.

    Fill in __init__ and read() using the vendor's example code. read() must
    return the newest samples as a numpy array shaped (channels, samples) in
    microvolts, or None if nothing new has arrived.
    """

    def __init__(self, state, channels=DEFAULT_CHANNELS):
        self.fs = 250                 # TODO: the headset's sampling rate in Hz
        self.channels = list(channels)
        # TODO: connect to the headset with the vendor's code, for example:
        # self.device = vendor_sdk.connect()
        # self.device.start_stream()
        raise NotImplementedError(
            "Open bci/bridge.py and fill in CustomSource with your headset's code, "
            "or use --source lsl if its software can stream over LSL.")

    def read(self):
        # TODO: return new samples shaped (channels, samples), e.g.
        # data = self.device.get_new_data()        # vendor call
        # return data[[c3_row, cz_row, c4_row]]    # keep only C3, Cz, C4
        return None


# --------------------------------------------------------------------------- state
class State:
    def __init__(self):
        self.cue = None
        self.mode = "feedback"        # "calibration" or "feedback"
        self.imagining = False
        self.trial_id = 0
        self.imagery_start = None     # sample index in the buffer
        self.epochs, self.labels = [], []


class Ring:
    """The last few seconds of EEG, plus a running sample counter."""

    def __init__(self, n_ch, fs, seconds=12):
        self.buf = np.zeros((n_ch, int(fs * seconds)))
        self.total = 0

    def push(self, x):
        n = x.shape[1]
        if n >= self.buf.shape[1]:
            self.buf[:] = x[:, -self.buf.shape[1]:]
        else:
            self.buf = np.roll(self.buf, -n, axis=1)
            self.buf[:, -n:] = x
        self.total += n

    def last(self, n):
        n = min(n, self.total, self.buf.shape[1])
        return self.buf[:, -n:] if n else None

    def since(self, start, n):
        """n samples beginning at absolute sample index `start`, if still buffered."""
        age = self.total - start
        if age < n or age > self.buf.shape[1]:
            return None
        a = self.buf.shape[1] - age
        return self.buf[:, a:a + n].copy()


# --------------------------------------------------------------------------- websocket
class Client:
    """Minimal WebSocket (RFC 6455) connection using only the standard library."""

    GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

    def __init__(self, reader, writer):
        self.reader, self.writer = reader, writer

    async def handshake(self):
        head = await self.reader.readuntil(b"\r\n\r\n")
        headers = {}
        for line in head.decode("latin-1").split("\r\n")[1:]:
            if ":" in line:
                k, v = line.split(":", 1)
                headers[k.strip().lower()] = v.strip()
        key = headers.get("sec-websocket-key")
        if not key:
            self.writer.write(b"HTTP/1.1 400 Bad Request\r\n\r\nNeuroHand bridge: open the website to connect.\n")
            await self.writer.drain()
            return False
        accept = base64.b64encode(hashlib.sha1((key + self.GUID).encode()).digest()).decode()
        self.writer.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n"
                           "Connection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n" % accept).encode())
        await self.writer.drain()
        return True

    async def recv(self):
        while True:
            b1, b2 = await self.reader.readexactly(2)
            opcode, masked, n = b1 & 0x0F, b2 & 0x80, b2 & 0x7F
            if n == 126:
                n = struct.unpack(">H", await self.reader.readexactly(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", await self.reader.readexactly(8))[0]
            mask = await self.reader.readexactly(4) if masked else b"\0\0\0\0"
            data = bytes(c ^ mask[i % 4] for i, c in enumerate(await self.reader.readexactly(n)))
            if opcode == 0x8:
                return None
            if opcode == 0x9:
                await self._frame(0xA, data)
                continue
            if opcode == 0x1:
                return data.decode("utf-8")

    async def _frame(self, opcode, payload):
        n = len(payload)
        head = bytes([0x80 | opcode])
        if n < 126:
            head += bytes([n])
        elif n < 65536:
            head += bytes([126]) + struct.pack(">H", n)
        else:
            head += bytes([127]) + struct.pack(">Q", n)
        self.writer.write(head + payload)
        await self.writer.drain()

    async def send(self, obj):
        await self._frame(0x1, json.dumps(obj).encode("utf-8"))


# --------------------------------------------------------------------------- bridge
class Bridge:
    def __init__(self, source_name, channels, port, pick=None):
        self.state = State()
        if source_name == "synthetic":
            self.source = SyntheticSource(self.state, channels=channels)
        elif source_name in ("lsl", "chords"):
            self.source = LSLSource(self.state, channels, pick)
        else:
            self.source = CustomSource(self.state, channels)
        self.source_name = source_name
        self.fs, self.channels = self.source.fs, self.source.channels
        self.ring = Ring(len(self.channels), self.fs)
        self.port = port
        self.clients = set()
        self.model = None
        self.smooth = None
        if os.path.exists(MODEL_PATH):
            m = MotorImageryModel.load(MODEL_PATH)
            if m.fs == self.fs and [c.upper() for c in m.channels] == [c.upper() for c in self.channels]:
                self.model = m
                print("Loaded model (accuracy %s)" % self._pct(m.accuracy))
            else:
                print("Saved model was made with different settings; calibrate again.")

    @staticmethod
    def _pct(x):
        return "n/a" if x is None else "%d%%" % round(100 * x)

    def status(self):
        y = np.array(self.state.labels, dtype=int)
        return {"type": "status", "source": self.source_name, "fs": self.fs, "channels": self.channels,
                "model": self.model is not None,
                "accuracy": None if self.model is None else self.model.accuracy,
                "calibration": {"left": int((y == 0).sum()), "right": int((y == 1).sum())}}

    async def broadcast(self, obj):
        for c in list(self.clients):
            try:
                await c.send(obj)
            except Exception:
                self.clients.discard(c)

    # ---- loops
    async def acquire(self):
        while True:
            x = self.source.read()
            if x is not None and x.size:
                self.ring.push(x)
            await asyncio.sleep(0.02)

    async def classify(self):
        w = int(WINDOW_S * self.fs)
        while True:
            await asyncio.sleep(0.1)
            st = self.state
            if not (st.imagining and st.mode == "feedback" and self.model):
                self.smooth = None
                continue
            elapsed = self.ring.total - st.imagery_start
            if elapsed < int(0.5 * self.fs):
                continue
            window = self.ring.last(w)
            if window is None or window.shape[1] < w:
                continue
            p = self.model.predict_proba(window)["left"]
            self.smooth = p if self.smooth is None else 0.7 * self.smooth + 0.3 * p
            await self.broadcast({"type": "prob", "left": round(self.smooth, 3), "right": round(1 - self.smooth, 3)})

    async def quality(self):
        while True:
            await asyncio.sleep(1.0)
            win = self.ring.last(int(2 * self.fs))
            if win is not None and win.shape[1] >= self.fs and self.clients:
                q = signal_quality(win, self.fs, getattr(self.source, "adc_max", None))
                await self.broadcast({"type": "quality", "channels": dict(zip(self.channels, q))})

    # ---- messages from the website
    async def handle(self, client, msg):
        st, t = self.state, msg.get("type")
        if t == "hello":
            await client.send(self.status())
        elif t == "cue":
            st.cue = msg.get("side")
            st.mode = msg.get("mode", "feedback")
            st.trial_id += 1
        elif t == "imagery_start":
            st.imagining = True
            st.imagery_start = self.ring.total
        elif t == "imagery_end":
            st.imagining = False
            if st.mode == "calibration" and st.cue in ("left", "right"):
                await asyncio.sleep(0.1)  # let the last samples arrive
                ep = self.ring.since(st.imagery_start + int(EPOCH_START_S * self.fs), int(EPOCH_LEN_S * self.fs))
                if ep is not None:
                    st.epochs.append(ep)
                    st.labels.append(0 if st.cue == "left" else 1)
                    await client.send(self.status())
        elif t == "abort":
            st.imagining = False      # paused or stopped mid-trial: discard it
            st.cue = None
        elif t == "calibration_reset":
            st.epochs, st.labels = [], []
        elif t == "calibration_end":
            await self.finish_calibration(client)

    async def finish_calibration(self, client):
        st = self.state
        if not st.epochs:
            await client.send({"type": "trained", "ok": False, "error": "No calibration trials were recorded."})
            return
        os.makedirs(DATA_DIR, exist_ok=True)
        path = os.path.join(DATA_DIR, "calibration_%s.npz" % datetime.now().strftime("%Y%m%d_%H%M%S"))
        np.savez(path, epochs=np.array(st.epochs), labels=np.array(st.labels),
                 fs=self.fs, channels=np.array(self.channels), source=self.source_name)
        print("Saved %d trials to %s" % (len(st.epochs), path))
        try:
            model, acc = await asyncio.get_running_loop().run_in_executor(
                None, train, np.array(st.epochs), np.array(st.labels), self.fs, self.channels)
        except ValueError as e:
            await client.send({"type": "trained", "ok": False, "error": str(e)})
            return
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        model.save(MODEL_PATH)
        self.model = model
        print("Trained model: accuracy %s on %s" % (self._pct(acc), model.n_trials))
        await self.broadcast({"type": "trained", "ok": True, "accuracy": acc, "trials": model.n_trials})
        await self.broadcast(self.status())

    async def serve_client(self, reader, writer):
        client = Client(reader, writer)
        try:
            if not await client.handshake():
                return
            self.clients.add(client)
            print("Website connected")
            await client.send(self.status())
            while True:
                raw = await client.recv()
                if raw is None:
                    break
                try:
                    await self.handle(client, json.loads(raw))
                except (ValueError, KeyError) as e:
                    print("Ignored message:", e)
        except (asyncio.IncompleteReadError, ConnectionError):
            pass
        finally:
            self.clients.discard(client)
            self.state.imagining = False
            writer.close()
            print("Website disconnected")

    async def run(self):
        server = await asyncio.start_server(self.serve_client, "127.0.0.1", self.port)
        print("NeuroHand bridge ready on ws://localhost:%d  (source: %s, %d Hz, %s)"
              % (self.port, self.source_name, self.fs, ", ".join(self.channels)))
        print("Open NeuroHand, go to Settings > EEG source > Live headset, then Training.")
        await asyncio.gather(server.serve_forever(), self.acquire(), self.classify(), self.quality())


def main():
    ap = argparse.ArgumentParser(description="NeuroHand EEG bridge")
    ap.add_argument("--source", choices=["synthetic", "chords", "lsl", "custom"], default="synthetic",
                    help="chords = NPG Lite via Upside Down Labs Chords (an LSL stream)")
    ap.add_argument("--pick", default=None, help="stream channel numbers to use as C3,Cz,C4, e.g. 1,2,3")
    ap.add_argument("--channels", default="C3,Cz,C4", help="channel names to use, comma separated")
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()
    try:
        pick = [int(x) for x in a.pick.split(",")] if a.pick else None
        asyncio.run(Bridge(a.source, [c.strip() for c in a.channels.split(",")], a.port, pick).run())
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
