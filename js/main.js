// NeuroHand static site: small page behaviours only (menus, forms, demo buttons).
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // Appearance: color mode and text size (saved in this browser; applied early by a snippet in each page head)
  const root = document.documentElement;
  const getPref = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } };
  const applyTheme = (t) => { if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme'); };
  const applySize = (v) => root.classList.toggle('large-text', v === 'large');
  applyTheme(getPref('nh.theme', 'system'));
  applySize(getPref('nh.textsize', 'default'));
  const themeInputs = document.querySelectorAll('input[name="theme"]');
  if (themeInputs.length) {
    const saved = () => { const m = $('settings-saved'); m.hidden = false; clearTimeout(m._t); m._t = setTimeout(() => { m.hidden = true; }, 1500); };
    const cur = getPref('nh.theme', 'system');
    themeInputs.forEach((inp) => {
      inp.checked = inp.value === cur;
      inp.addEventListener('change', () => { if (!inp.checked) return; setPref('nh.theme', inp.value); applyTheme(inp.value); saved(); });
    });
    const sizeBtns = document.querySelectorAll('[data-size]');
    const markSize = (v) => sizeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === v)));
    markSize(getPref('nh.textsize', 'default'));
    sizeBtns.forEach((b) => b.addEventListener('click', () => { setPref('nh.textsize', b.dataset.size); applySize(b.dataset.size); markSize(b.dataset.size); saved(); }));
  }

  // Public header menu on small screens
  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = $(btn.dataset.toggle).classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // App sidebar on small screens
  const shell = $('app-shell');
  if (shell && $('app-menu')) {
    $('app-menu').addEventListener('click', (e) => { e.stopPropagation(); shell.classList.add('nav-open'); });
    document.addEventListener('click', (e) => {
      if (shell.classList.contains('nav-open') && !$('sidebar').contains(e.target)) shell.classList.remove('nav-open');
    });
  }

  // Log in / sign up (no backend yet: any email and password continue to Home)
  const form = $('login-form');
  if (form) {
    const signup = new URLSearchParams(location.search).get('mode') === 'signup';
    if (signup) {
      document.title = 'Sign up · NeuroHand';
      $('auth-title').textContent = 'Create an account';
      $('auth-switch').innerHTML = 'Already have an account? <a href="login.html">Log in</a>';
      $('name-field').hidden = false;
      $('forgot').hidden = true;
      $('password').autocomplete = 'new-password';
      $('submit').textContent = 'Create account';
    }
    $('forgot').addEventListener('click', (e) => {
      e.preventDefault();
      showError('Password reset is not set up yet. Ask your research team for help.');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('email').value.trim();
      if (signup && !$('name').value.trim()) return showError('Enter your full name.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return showError('Enter a valid email address, like name@example.com.');
      if (!$('password').value) return showError('Enter your password.');
      location.href = signup ? 'guide.html' : 'home.html';
    });
  }
  function showError(msg) { const el = $('form-error'); el.textContent = msg; el.hidden = false; }

  // Device: demo search
  const search = $('search-btn');
  if (search) {
    search.addEventListener('click', () => {
      $('state-empty').hidden = true;
      $('state-searching').hidden = false;
      setTimeout(() => { $('state-searching').hidden = true; $('state-found').hidden = false; }, 1500);
    });
  }

  // Training: start / pause label
  const start = $('start-btn');
  if (start) {
    start.addEventListener('click', () => {
      const running = start.textContent !== 'Pause';
      start.textContent = running ? 'Pause' : 'Start training';
      $('trial-status').textContent = running ? 'In progress' : 'Paused';
    });
  }

  // Progress: filter rows, export CSV, researcher notes
  const range = $('range');
  if (range) {
    const rows = Array.from(document.querySelectorAll('#history tbody tr'));
    range.addEventListener('change', () => {
      const n = range.value === 'all' ? rows.length : Number(range.value);
      rows.forEach((r, i) => { r.hidden = i >= n; });
    });

    $('export-btn').addEventListener('click', () => {
      const lines = [['Session', 'Date', 'Left', 'Right', 'Overall', 'Duration']]
        .concat(rows.filter((r) => !r.hidden).map((r) => Array.from(r.cells).map((c) => c.textContent.trim())));
      const blob = new Blob([lines.map((l) => l.join(',')).join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'neurohand-P-01-progress.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    const KEY = 'neurohand.notes.P-01';
    try { $('notes').value = localStorage.getItem(KEY) || ''; } catch (e) { /* storage unavailable */ }
    $('save-note').addEventListener('click', () => {
      try { localStorage.setItem(KEY, $('notes').value); } catch (e) { /* storage unavailable */ }
      $('note-status').hidden = false;
      setTimeout(() => { $('note-status').hidden = true; }, 2000);
    });
  }
})();

// Training: full-screen simulation (simulated EEG, no device needed)
// Runs today's recommended sets with rest breaks. The user can pause or stop at any time.
(function () {
  const sim = document.getElementById('sim');
  const openBtn = document.getElementById('sim-open');
  if (!sim || !openBtn) return;
  const $ = (id) => document.getElementById(id);
  const hands = { left: $('sim-left'), right: $('sim-right') };
  const cue = $('sim-cue'), sub = $('sim-sub'), conf = $('sim-conf'), count = $('sim-count');
  const panel = $('sim-panel'), pauseBtn = $('sim-pause');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Phase lengths in ms: rest (fixation), cue, imagery, feedback
  const T = { rest: 2000, cue: 1200, imagery: 3500, feedback: 1600 };
  let raf = 0, paused = false, phase = 'rest', phaseStart = 0, pausedAt = 0, restTimer = 0;
  let plan = { sets: 2, trialsPerSet: 10, restSeconds: 60, mix: { left: 0.5, right: 0.5 } };
  let set = 1, trial = 1, hits = 0, total = 0, side = 'left', willHit = true, peak = 0, startedAt = 0, recorded = false;
  const byHand = { left: { hits: 0, total: 0 }, right: { hits: 0, total: 0 } };

  const setClose = (el, c) => el.querySelector('.sim-hand').style.setProperty('--c', c.toFixed(3));
  const openHands = () => ['left', 'right'].forEach((s) => setClose(hands[s], 0));
  const updateCount = () => { count.textContent = 'Set ' + set + ' of ' + plan.sets + ' · Trial ' + trial + ' of ' + plan.trialsPerSet; };
  const phaseText = () => ({ rest: 'Relax and look at the cross', cue: 'Get ready', imagery: 'Imagine closing your ' + side + ' hand', feedback: Math.round(peak * 100) + '% confidence' }[phase]);

  function enter(p, now) {
    phase = p; phaseStart = now;
    if (p === 'rest') {
      cue.textContent = '+'; cue.classList.remove('hit');
      hands.left.classList.remove('cued'); hands.right.classList.remove('cued');
      conf.style.width = '0%';
    } else if (p === 'cue') {
      side = Math.random() < plan.mix.left ? 'left' : 'right';
      willHit = Math.random() < 0.78; peak = willHit ? 0.7 + Math.random() * 0.25 : 0.25 + Math.random() * 0.3;
      cue.textContent = side === 'left' ? 'Left hand' : 'Right hand';
      hands[side].classList.add('cued');
    } else if (p === 'feedback') {
      total++; byHand[side].total++;
      if (willHit) { hits++; byHand[side].hits++; cue.textContent = 'Recognized'; cue.classList.add('hit'); } else { cue.textContent = 'Not recognized'; }
    }
    sub.textContent = phaseText();
    updateCount();
  }
  function tick(now) {
    if (paused || !panel.hidden) return;
    const t = now - phaseStart;
    if (phase === 'imagery') {
      // Simulated classifier output rises toward this trial's peak, with jitter
      const k = Math.min(1, t / (T.imagery * 0.7));
      const out = Math.max(0, Math.min(1, peak * k + (Math.random() - 0.5) * 0.06));
      conf.style.width = (out * 100).toFixed(1) + '%';
      const c = out >= 0.6 ? Math.min(1, (out - 0.6) / 0.25 + 0.35) : 0;
      setClose(hands[side], reduce ? (c > 0 ? 1 : 0) : c);
    } else if (phase === 'rest') openHands();
    if (t >= T[phase]) {
      if (phase === 'feedback') {
        openHands();
        if (trial >= plan.trialsPerSet) { endOfSet(); return; }
        trial++;
      }
      enter({ rest: 'cue', cue: 'imagery', imagery: 'feedback', feedback: 'rest' }[phase], now);
    }
    raf = requestAnimationFrame(tick);
  }

  // Rest between sets, and the end-of-session summary
  function showPanel(opts) {
    $('sp-k').textContent = opts.k; $('sp-title').textContent = opts.title; $('sp-text').textContent = opts.text;
    $('sp-timer').hidden = !opts.timer; $('sp-next').hidden = !opts.next; $('sp-home').hidden = !opts.home;
    $('sp-stop').textContent = opts.stopLabel; $('sp-foot').hidden = !opts.foot;
    panel.hidden = false; pauseBtn.disabled = true;
    cue.textContent = ''; sub.textContent = '';
  }
  function endOfSet() {
    cancelAnimationFrame(raf);
    if (set >= plan.sets) {
      record(false);
      showPanel({ k: 'Session complete', title: 'Well done', timer: false, next: false, home: true, foot: false, stopLabel: 'Close',
        text: hits + ' of ' + total + ' recognized' + (window.NH && !NH.HARDWARE_CONNECTED ? ' (demo)' : '') + '. Rest now.' });
      $('sp-home').focus();
      setStatus('Completed');
      return;
    }
    let left = plan.restSeconds;
    const fmt = (n) => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
    showPanel({ k: 'Set ' + set + ' of ' + plan.sets + ' complete', title: 'Time to rest', timer: true, next: true, home: false, foot: true, stopLabel: 'Stop for today',
      text: 'Relax your hands and breathe slowly.' });
    const next = $('sp-next');
    next.disabled = true; next.textContent = 'Resting…';
    $('sp-timer').textContent = fmt(left);
    $('sp-stop').focus();
    clearInterval(restTimer);
    restTimer = setInterval(() => {
      left--; $('sp-timer').textContent = fmt(Math.max(0, left));
      if (left <= 0) { clearInterval(restTimer); next.disabled = false; next.textContent = 'Start set ' + (set + 1); next.focus(); }
    }, 1000);
  }
  $('sp-next').addEventListener('click', () => {
    panel.hidden = true; pauseBtn.disabled = false;
    set++; trial = 1;
    enter('rest', performance.now()); raf = requestAnimationFrame(tick);
  });
  $('sp-stop').addEventListener('click', () => close());

  // Save this session's results so the plan can be analysed and updated
  function record(stopped) {
    if (recorded || !total || !window.NH) return;
    recorded = true;
    const pct = (h) => (h.total ? Math.round((h.hits / h.total) * 100) : null);
    NH.recordSession({ left: pct(byHand.left), right: pct(byHand.right), trials: total, minutes: Math.max(1, Math.round((Date.now() - startedAt) / 60000)), stopped });
  }

  function setPaused(p) {
    if (!panel.hidden || p === paused) return;
    const now = performance.now();
    paused = p;
    pauseBtn.setAttribute('aria-pressed', String(p));
    pauseBtn.querySelector('span').textContent = p ? 'Resume' : 'Pause';
    if (p) { pausedAt = now; sub.textContent = 'Paused. Press Resume to continue.'; cancelAnimationFrame(raf); }
    else { phaseStart += now - pausedAt; sub.textContent = phaseText(); raf = requestAnimationFrame(tick); }
  }
  function setStatus(t) { const el = $('trial-status'); if (el) el.textContent = t; }

  function open() {
    const r = window.NH ? NH.recommend() : null;
    if (r) plan = { sets: r.sets, trialsPerSet: r.trialsPerSet, restSeconds: r.restSeconds, mix: r.mix };
    sim.hidden = false; document.body.classList.add('sim-on'); panel.hidden = true; pauseBtn.disabled = false;
    set = 1; trial = 1; hits = 0; total = 0; paused = false; startedAt = Date.now(); recorded = false;
    byHand.left = { hits: 0, total: 0 }; byHand.right = { hits: 0, total: 0 };
    pauseBtn.setAttribute('aria-pressed', 'false'); pauseBtn.querySelector('span').textContent = 'Pause';
    try { const p = sim.requestFullscreen && sim.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* fullscreen not allowed: overlay still fills the window */ }
    enter('rest', performance.now()); raf = requestAnimationFrame(tick);
    setStatus('In progress');
    $('sim-close').focus();
  }
  function close() {
    if (sim.hidden) return;
    cancelAnimationFrame(raf); clearInterval(restTimer);
    const finished = panel.hidden === false && $('sp-home').hidden === false;
    sim.hidden = true; document.body.classList.remove('sim-on');
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) { /* ignore */ }
    if (!finished) { setStatus('Stopped'); record(true); }
    openBtn.focus();
  }
  openBtn.addEventListener('click', open);
  $('sim-close').addEventListener('click', close);
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !sim.hidden) close(); });
  document.addEventListener('keydown', (e) => {
    if (sim.hidden) return;
    if (e.key === 'Escape') close();
    else if ((e.key === ' ' || e.code === 'Space') && !e.target.closest('button, a')) { e.preventDefault(); setPaused(!paused); }
  });
  sim.addEventListener('click', (e) => { if (!e.target.closest('button, a, .sim-panel')) setPaused(!paused); });
})();
