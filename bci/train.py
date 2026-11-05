"""Train the NeuroHand left/right model.

    python train.py                 # retrain from every calibration file in bci/data/
    python train.py --demo          # quick check with generated fake EEG
    python train.py --public 1      # try BCI Competition IV 2b (C3, Cz, C4), subject 1
                                    # needs: pip install moabb

The bridge already trains automatically at the end of each calibration. Use this
script to retrain from several calibration sessions at once.
"""
import argparse
import glob
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bci_core import train  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
MODEL_PATH = os.path.join(HERE, "models", "model.pkl")


def load_calibrations():
    files = sorted(glob.glob(os.path.join(DATA_DIR, "calibration_*.npz")))
    if not files:
        sys.exit("No calibration files in %s. Run a calibration from the website first." % DATA_DIR)
    epochs, labels, fs, channels = [], [], None, None
    for f in files:
        d = np.load(f, allow_pickle=False)
        f_fs, f_ch = int(d["fs"]), [str(c) for c in d["channels"]]
        if fs is None:
            fs, channels = f_fs, f_ch
        if f_fs != fs or f_ch != channels:
            print("Skipping %s (different headset settings)" % os.path.basename(f))
            continue
        epochs += list(d["epochs"])
        labels += list(d["labels"])
        print("Loaded %-40s %3d trials" % (os.path.basename(f), len(d["labels"])))
    return np.array(epochs), np.array(labels), fs, channels


def demo_data(n_per_class=40, fs=250, seed=1):
    """Generated EEG like the bridge's synthetic source: mu rhythm drops over the opposite side."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(3.0 * fs)) / fs
    epochs, labels = [], []
    for k in range(2 * n_per_class):
        side = k % 2
        amp = np.array([12.0, 12.0, 12.0])
        if rng.random() < 0.8:
            amp[2 if side == 0 else 0] *= 0.35   # left hand -> C4, right hand -> C3
        noise = np.cumsum(rng.normal(0, 6, (3, t.size)), axis=1)
        noise -= np.linspace(noise[:, :1], noise[:, -1:], t.size, axis=1)[..., 0]
        ep = 0.4 * noise + amp[:, None] * np.sin(2 * np.pi * 10 * t + rng.uniform(0, 6.3, (3, 1)))
        epochs.append(ep)
        labels.append(side)
    return np.array(epochs), np.array(labels), fs, ["C3", "Cz", "C4"]


def public_data(subject):
    try:
        from moabb.paradigms import LeftRightImagery
        try:
            from moabb.datasets import BNCI2014_004 as Dataset
        except ImportError:
            from moabb.datasets import BNCI2014004 as Dataset
    except ImportError:
        sys.exit("This option needs MOABB: pip install moabb")
    paradigm = LeftRightImagery(resample=250)
    X, y, _ = paradigm.get_data(dataset=Dataset(), subjects=[subject])
    X = X * 1e6                                # volts -> microvolts
    labels = np.array([0 if v.startswith("left") else 1 for v in y])
    return X[:, :, int(0.5 * 250):int(3.5 * 250)], labels, 250, ["C3", "Cz", "C4"]


def main():
    ap = argparse.ArgumentParser(description="Train the NeuroHand left/right model")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--demo", action="store_true", help="use generated fake EEG")
    g.add_argument("--public", type=int, metavar="SUBJECT", help="use BCI Competition IV 2b, subject 1-9")
    ap.add_argument("--no-save", action="store_true", help="only report accuracy")
    a = ap.parse_args()

    if a.demo:
        X, y, fs, ch = demo_data()
    elif a.public:
        X, y, fs, ch = public_data(a.public)
    else:
        X, y, fs, ch = load_calibrations()

    print("Training on %d trials (%d left, %d right), %d Hz, channels %s"
          % (len(y), (y == 0).sum(), (y == 1).sum(), fs, ", ".join(ch)))
    model, acc = train(X, y, fs, ch)
    print("Cross-validated accuracy: %d%%  (50%% = guessing)" % round(100 * acc))

    if a.no_save or a.demo or a.public:
        print("Model not saved (only calibration data from your own headset is saved).")
        return
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    model.save(MODEL_PATH)
    print("Saved %s. Restart the bridge to use it." % MODEL_PATH)


if __name__ == "__main__":
    main()
