// NeuroHand live EEG link. When Settings > EEG source is "Live headset", this connects to
// the bridge running on this computer (bci/bridge.py) at ws://localhost:8765.
(function () {
  'use strict';
  const NH = (window.NH = window.NH || {});
  let enabled = false;
  try { enabled = localStorage.getItem('nh.source') === 'live'; } catch (e) { /* storage unavailable */ }
  const live = (NH.live = { enabled, connected: false, status: null, prob: null, probSeq: 0, trained: null });
  let ws = null, timer = 0;
  const changed = () => document.dispatchEvent(new CustomEvent('nh:live'));

  live.ready = () => live.enabled && live.connected && !!(live.status && live.status.model);
  live.send = (obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };

  function connect() {
    clearTimeout(timer);
    try { ws = new WebSocket('ws://localhost:8765'); } catch (e) { timer = setTimeout(connect, 3000); return; }
    ws.onopen = () => { live.connected = true; live.send({ type: 'hello' }); changed(); };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'status') { live.status = m; changed(); }
      else if (m.type === 'prob') { live.prob = m; live.probSeq++; }
      else if (m.type === 'trained') { live.trained = m; changed(); document.dispatchEvent(new CustomEvent('nh:trained', { detail: m })); }
      else if (m.type === 'quality' && m.channels) {
        const q = {};
        Object.keys(m.channels).forEach((k) => { const name = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase(); q[name] = m.channels[k]; });
        if (NH.setSignal) NH.setSignal(q);
        document.querySelectorAll('[data-signal]').forEach((el) => { const v = q[el.dataset.signal]; if (v) { el.textContent = v; el.className = 'q-' + v; } });
      }
    };
    ws.onclose = () => {
      const was = live.connected;
      live.connected = false; live.status = null; ws = null;
      if (was) changed();
      timer = setTimeout(connect, 3000);
    };
    ws.onerror = () => { /* onclose retries */ };
  }
  if (enabled) connect();
})();
