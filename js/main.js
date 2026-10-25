// NeuroHand static site: small page behaviours only (menus, forms, demo buttons).
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

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
      location.href = 'home.html';
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
(function () {
  const sim = document.getElementById('sim');
  const openBtn = document.getElementById('sim-open');
  if (!sim || !openBtn) return;
  const $ = (id) => document.getElementById(id);
  const hands = { left: $('sim-left'), right: $('sim-right') };
  const cue = $('sim-cue'), sub = $('sim-sub'), conf = $('sim-conf'), count = $('sim-count');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Phase lengths in ms: rest (fixation), cue, imagery, feedback
  const T = { rest: 2000, cue: 1200, imagery: 3500, feedback: 1600 };
  let raf = 0, paused = false, phase = 'rest', phaseStart = 0, pausedAt = 0;
  let trial = 1, hits = 0, side = 'left', willHit = true, peak = 0;

  const setClose = (el, c) => el.querySelector('.sim-hand').style.setProperty('--c', c.toFixed(3));
  function enter(p, now) {
    phase = p; phaseStart = now;
    if (p === 'rest') {
      cue.textContent = '+'; cue.classList.remove('hit'); sub.textContent = 'Relax and look at the cross';
      hands.left.classList.remove('cued'); hands.right.classList.remove('cued');
      conf.style.width = '0%';
    } else if (p === 'cue') {
      side = Math.random() < 0.5 ? 'left' : 'right';
      willHit = Math.random() < 0.78; peak = willHit ? 0.7 + Math.random() * 0.25 : 0.25 + Math.random() * 0.3;
      cue.textContent = side === 'left' ? 'Left hand' : 'Right hand'; sub.textContent = 'Get ready';
      hands[side].classList.add('cued');
    } else if (p === 'imagery') {
      sub.textContent = 'Imagine closing your ' + side + ' hand';
    } else if (p === 'feedback') {
      if (willHit) { hits++; cue.textContent = 'Recognized'; cue.classList.add('hit'); }
      else { cue.textContent = 'Not recognized'; }
      sub.textContent = Math.round(peak * 100) + '% confidence';
      count.textContent = 'Trial ' + trial + ' · ' + hits + (hits === 1 ? ' hit' : ' hits');
    }
  }
  function tick(now) {
    if (paused) return;
    const t = now - phaseStart;
    if (phase === 'imagery') {
      // Simulated classifier output rises toward this trial's peak, with jitter
      const k = Math.min(1, t / (T.imagery * 0.7));
      const out = Math.max(0, Math.min(1, peak * k + (Math.random() - 0.5) * 0.06));
      conf.style.width = (out * 100).toFixed(1) + '%';
      const c = out >= 0.6 ? Math.min(1, (out - 0.6) / 0.25 + 0.35) : 0;
      setClose(hands[side], reduce ? (c > 0 ? 1 : 0) : c);
    } else if (phase === 'feedback' || phase === 'cue') {
      // hold
    } else {
      ['left', 'right'].forEach((s) => setClose(hands[s], 0));
    }
    if (t >= T[phase]) {
      const next = { rest: 'cue', cue: 'imagery', imagery: 'feedback', feedback: 'rest' }[phase];
      if (phase === 'feedback') { trial++; ['left', 'right'].forEach((s) => setClose(hands[s], 0)); }
      enter(next, now);
    }
    raf = requestAnimationFrame(tick);
  }
  function togglePause() {
    const now = performance.now();
    paused = !paused;
    if (paused) { pausedAt = now; sub.textContent = 'Paused · press Space to continue'; cancelAnimationFrame(raf); }
    else {
      phaseStart += now - pausedAt;
      sub.textContent = { rest: 'Relax and look at the cross', cue: 'Get ready', imagery: 'Imagine closing your ' + side + ' hand', feedback: Math.round(peak * 100) + '% confidence' }[phase];
      raf = requestAnimationFrame(tick);
    }
  }
  function open() {
    sim.hidden = false; document.body.classList.add('sim-on');
    trial = 1; hits = 0; paused = false; count.textContent = 'Trial 1 · 0 hits';
    try { const r = sim.requestFullscreen && sim.requestFullscreen(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* fullscreen not allowed: overlay still fills the window */ }
    enter('rest', performance.now()); raf = requestAnimationFrame(tick);
    $('sim-close').focus();
  }
  function close() {
    cancelAnimationFrame(raf); sim.hidden = true; document.body.classList.remove('sim-on');
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) { /* ignore */ }
    openBtn.focus();
  }
  openBtn.addEventListener('click', open);
  $('sim-close').addEventListener('click', close);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !sim.hidden) close(); });
  document.addEventListener('keydown', (e) => {
    if (sim.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePause(); }
  });
  sim.addEventListener('click', (e) => { if (!e.target.closest('.sim-exit')) togglePause(); });
})();
