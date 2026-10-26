// NeuroHand Daily Training Assistant
// Collects each session's results, analyses them, and builds a personal plan in levels.
// The plan always stays inside fixed safety limits set by the research team: it can
// ease off or move up a level, but it never goes above those limits.
(function () {
  'use strict';
  const NH = (window.NH = window.NH || {});

  // Set to true once a real EEG headset streams data. Until then every result is labelled DEMO DATA.
  NH.HARDWARE_CONNECTED = false;

  const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  NH.DAY_LONG = DAY_LONG; NH.DAY_SHORT = DAY_SHORT; NH.MONTHS = MONTHS;

  // ---------- Storage (per browser; wrapped because it can be unavailable) ----------
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
  };
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fromIso = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const avg = (arr) => { const v = arr.filter((x) => x != null && !isNaN(x)); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const overall = (s) => avg([s.left, s.right]);
  NH.today = today; NH.iso = iso; NH.fromIso = fromIso; NH.overall = overall;
  NH.longDate = (d) => DAY_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  NH.shortDate = (d) => DAY_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3);

  // ---------- Safety limits and levels ----------
  // Fixed by the NeuroHand research team. No level and no adjustment can go above these.
  NH.LIMITS = { maxMinutes: 20, maxSessionsPerWeek: 5, maxSetsPerSession: 3, maxTrialsPerSet: 12, minRestSeconds: 45 };
  const estMinutes = (sets, trials, rest) => Math.max(3, Math.round((sets * trials * 8.3 + (sets - 1) * rest) / 60 + 2));
  NH.estMinutes = estMinutes;
  const LEVELS = [
    { id: 'starting', name: 'Starting check', days: [1, 3, 5], sets: 2, trialsPerSet: 8, restSeconds: 60,
      about: 'Finding your starting point.' },
    { id: 'beginner', name: 'Beginner', days: [1, 3, 5], sets: 2, trialsPerSet: 10, restSeconds: 60, up: 60,
      about: '3 sessions a week.' },
    { id: 'building', name: 'Building', days: [1, 2, 4, 5], sets: 3, trialsPerSet: 10, restSeconds: 60, up: 68,
      about: '4 sessions a week, 3 sets each.' },
    { id: 'steady', name: 'Steady', days: [1, 2, 3, 4, 5], sets: 3, trialsPerSet: 12, restSeconds: 45,
      about: '5 sessions a week. The highest level.' }
  ];
  LEVELS.forEach((l) => {
    l.minutes = estMinutes(l.sets, l.trialsPerSet, l.restSeconds);
    const L = NH.LIMITS;
    if (l.minutes > L.maxMinutes || l.days.length > L.maxSessionsPerWeek || l.sets > L.maxSetsPerSession || l.trialsPerSet > L.maxTrialsPerSet || l.restSeconds < L.minRestSeconds) {
      throw new Error('Level ' + l.id + ' is outside the safety limits');
    }
  });
  NH.LEVELS = LEVELS;

  // ---------- Onboarding, history and check-in ----------
  NH.getOnboard = () => store.get('nh.onboard', null);
  NH.isOnboarded = () => !!NH.getOnboard();
  NH.getHistory = () => store.get('nh.history', []);
  const setHistory = (h) => store.set('nh.history', h);
  NH.completeOnboarding = () => { store.set('nh.onboard', { date: iso(today()), consent: true, demo: false }); setHistory([]); store.del('nh.checkin'); };
  NH.resetAll = () => ['nh.history', 'nh.onboard', 'nh.checkin', 'nh.demo.signal', 'nh.plan', 'nh.done'].forEach(store.del);

  // DEMO DATA: eight earlier sessions on Mon/Wed/Fri, ending before today.
  NH.loadDemo = () => {
    const dates = []; const d = today();
    while (dates.length < 8) { d.setDate(d.getDate() - 1); if ([1, 3, 5].includes(d.getDay())) dates.unshift(iso(d)); }
    const rows = [
      [54, 50, 'good', 'good', 16, 5], [56, 54, 'good', 'good', 16, 5], [56, 52, 'tired', 'good', 16, 5],
      [60, 56, 'good', 'good', 20, 6], [62, 60, 'good', 'fair', 20, 6], [66, 62, 'good', 'good', 20, 6],
      [70, 64, 'good', 'good', 30, 8], [72, 66, 'good', 'good', 30, 8]
    ];
    setHistory(rows.map((r, i) => ({ date: dates[i], left: r[0], right: r[1], feeling: r[2], signal: r[3], trials: r[4], minutes: r[5], stopped: false, demo: true })));
    store.set('nh.onboard', { date: dates[0], consent: true, demo: true });
    store.del('nh.checkin');
  };

  NH.getSignal = () => Object.assign({ C3: 'good', Cz: 'good', C4: 'fair' }, store.get('nh.demo.signal', {}));
  NH.setSignal = (s) => store.set('nh.demo.signal', s);
  const worstSignal = () => { const v = Object.values(NH.getSignal()); return v.includes('poor') ? 'poor' : v.includes('fair') ? 'fair' : 'good'; };

  NH.FEELINGS = { good: 'Feeling good', tired: 'A little tired', uncomfortable: 'Feeling uncomfortable' };
  NH.getFeeling = () => { const c = store.get('nh.checkin', null); return c && c.date === iso(today()) ? c.feeling : null; };
  NH.setFeeling = (f) => {
    if (f) store.set('nh.checkin', { date: iso(today()), feeling: f }); else store.del('nh.checkin');
    document.dispatchEvent(new CustomEvent('nh:change'));
  };

  // Called by the training session when it ends (finished or stopped early).
  NH.recordSession = (rec) => {
    const h = NH.getHistory();
    h.push(Object.assign({ date: iso(today()), feeling: NH.getFeeling(), signal: worstSignal(), demo: !NH.HARDWARE_CONNECTED }, rec));
    setHistory(h);
    document.dispatchEvent(new CustomEvent('nh:change'));
  };
  NH.todaySession = () => NH.getHistory().filter((s) => s.date === iso(today())).pop() || null;

  // ---------- Analysis: replay the history to find the level, then summarise ----------
  NH.analyse = () => {
    const h = NH.getHistory();
    let li = 0, atLevel = [];
    const changes = [];
    h.forEach((s) => {
      s.levelIndex = li;
      atLevel.push(s);
      const last3 = atLevel.slice(-3);
      const unc = last3.some((x) => x.feeling === 'uncomfortable');
      const tiredish = last3.filter((x) => x.feeling === 'tired' || x.stopped).length;
      const move = (to, dir, reason) => { changes.push({ date: s.date, from: LEVELS[li].name, to: LEVELS[to].name, dir, reason }); li = to; atLevel = []; };
      if (li === 0) { if (atLevel.filter((x) => !x.stopped).length >= 3) move(1, 'up', 'Starting check done.'); return; }
      if (li > 1 && (unc || tiredish >= 2)) {
        move(li - 1, 'down', unc ? 'You felt uncomfortable.' : 'Tired or stopped early twice.');
        return;
      }
      if (li < 3 && atLevel.length >= 3) {
        const a = avg(last3.map(overall));
        if (tiredish === 0 && !unc && last3.every((x) => x.signal !== 'poor') && a >= LEVELS[li].up) {
          move(li + 1, 'up', 'Average ' + a + '% over 3 sessions.');
        }
      }
    });

    const level = LEVELS[li];
    const last3 = atLevel.slice(-3);
    const tiredish = last3.filter((x) => x.feeling === 'tired' || x.stopped).length;
    let next = null;
    if (li === 0) {
      const n = atLevel.filter((x) => !x.stopped).length;
      next = { target: LEVELS[1].name, items: [{ label: 'Sessions done', done: n >= 3, value: n + ' of 3' }] };
    } else if (li < 3) {
      const a = avg(last3.map(overall));
      next = { target: LEVELS[li + 1].name, items: [
        { label: 'Sessions done', done: atLevel.length >= 3, value: Math.min(atLevel.length, 3) + ' of 3' },
        { label: 'Average ' + level.up + '% or more', done: a != null && a >= level.up, value: a == null ? '' : a + '%' },
        { label: 'No tired days', done: last3.length > 0 && tiredish === 0, value: tiredish ? tiredish + ' recently' : '' },
        { label: 'Good signal', done: last3.length > 0 && last3.every((x) => x.signal !== 'poor'), value: '' }
      ] };
    }

    // Results from sessions with a poor signal are left out of the analysis.
    const valid = h.filter((s) => s.signal !== 'poor' && !s.stopped);
    const base = valid.slice(0, 3), recent = valid.slice(-3), prev = valid.slice(-6, -3);
    const hand = (arr, k) => avg(arr.map((s) => s[k]));
    const hands = ['left', 'right'].map((k) => ({ hand: k, recent: hand(recent, k), base: hand(base, k), prev: hand(prev, k) }));
    const recentAvg = avg(recent.map(overall)), prevAvg = avg(prev.map(overall)), baseAvg = avg(base.map(overall));
    const last5 = valid.slice(-5).map(overall);
    const m = avg(last5);
    const sd = last5.length >= 3 ? Math.sqrt(last5.reduce((acc, v) => acc + (v - m) * (v - m), 0) / last5.length) : null;
    const feelings = { good: 0, tired: 0, uncomfortable: 0 };
    h.forEach((s) => { if (feelings[s.feeling] != null) feelings[s.feeling]++; });

    return {
      history: h, levelIndex: li, level, atLevel, changes, next, hands, valid,
      recentAvg, prevAvg, baseAvg,
      trend: prevAvg == null || recentAvg == null ? null : recentAvg - prevAvg >= 3 ? 'up' : prevAvg - recentAvg >= 3 ? 'down' : 'flat',
      consistency: sd == null ? null : sd < 4 ? 'steady' : 'varies',
      feelings,
      excluded: h.filter((s) => s.signal === 'poor').length,
      stoppedCount: h.filter((s) => s.stopped).length,
      minutesTotal: h.reduce((a, s) => a + (s.minutes || 0), 0)
    };
  };

  // Plain-language findings for the My plan and Progress pages
  NH.insights = (a) => {
    const out = [];
    if (!a.history.length) return ['No sessions yet.'];
    if (a.levelIndex === 0) out.push('Starting check: ' + a.atLevel.filter((x) => !x.stopped).length + ' of 3 done.');
    const [L, R] = a.hands;
    if (L.recent != null && R.recent != null) {
      const gap = L.recent - R.recent;
      if (Math.abs(gap) >= 4) out.push('Your ' + (gap > 0 ? 'right' : 'left') + ' hand gets extra practice (' + Math.min(L.recent, R.recent) + '% vs ' + Math.max(L.recent, R.recent) + '%).');
      else out.push('Both hands are about even.');
    }
    if (a.baseAvg != null && a.recentAvg != null && a.valid.length >= 4) {
      const ch = a.recentAvg - a.baseAvg;
      out.push(ch >= 3 ? 'Up from ' + a.baseAvg + '% to ' + a.recentAvg + '% since you started.' : ch <= -3 ? 'Down from ' + a.baseAvg + '% to ' + a.recentAvg + '%. Tiredness or headset fit can cause this.' : 'About the same as when you started.');
    }
    if (a.consistency === 'varies') out.push('Results vary a lot. Check the headset fit.');
    if (a.excluded) out.push(a.excluded + (a.excluded === 1 ? ' session' : ' sessions') + ' left out (poor signal).');
    return out;
  };

  // ---------- Week ----------
  NH.weekStart = (d) => { const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return s; };
  NH.weekDays = (start) => Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  // completed | stopped | today | upcoming | rested | rest | before
  NH.dayStatus = (date, a) => {
    const t = today(), key = iso(date), ob = NH.getOnboard();
    const recs = a.history.filter((s) => s.date === key);
    if (recs.length) return recs[recs.length - 1].stopped ? 'stopped' : 'completed';
    if (!ob || key < ob.date) return date >= t && ob ? (a.level.days.includes(date.getDay()) ? (date.getTime() === t.getTime() ? 'today' : 'upcoming') : 'rest') : 'before';
    const firstToday = a.history.length === 0 && date.getTime() === t.getTime();
    if (!a.level.days.includes(date.getDay()) && !firstToday) return 'rest';
    if (date.getTime() === t.getTime()) return 'today';
    if (date > t) return 'upcoming';
    return 'rested';
  };
  NH.weekSummary = (a, start) => {
    const days = NH.weekDays(start || NH.weekStart(today()));
    const statuses = days.map((d) => NH.dayStatus(d, a));
    return {
      days, statuses,
      planned: statuses.filter((s) => s !== 'rest' && s !== 'before').length,
      completed: statuses.filter((s) => s === 'completed' || s === 'stopped').length
    };
  };
  NH.nextSessionDate = (a) => {
    const d = today();
    for (let i = 1; i <= 7; i++) { d.setDate(d.getDate() + 1); if (a.level.days.includes(d.getDay())) return new Date(d); }
    return null;
  };

  // ---------- Today's recommendation ----------
  const HAND_FOR = { C3: 'right-hand', C4: 'left-hand', Cz: 'both-hand' }; // electrode over the opposite motor cortex
  NH.recommend = () => {
    const a = NH.analyse();
    const L = a.level, feeling = NH.getFeeling(), signal = NH.getSignal(), t = today();
    const week = NH.weekSummary(a);
    const r = {
      state: 'train', a, level: L, feeling, week,
      sets: L.sets, trialsPerSet: L.trialsPerSet, restSeconds: L.restSeconds, minutes: L.minutes,
      mix: { left: 0.5, right: 0.5 }, focus: '', focusDetail: '', summary: '', reasons: [], notices: []
    };
    const LIM = NH.LIMITS;
    const limitsReason = 'Your plan stays within fixed safety limits.';
    const adviceReason = 'Recognition is not physical recovery. This is a training suggestion, not medical advice.';

    if (!NH.isOnboarded()) {
      r.state = 'onboard';
      r.focus = 'Welcome to NeuroHand';
      r.summary = 'Start with a 5-minute beginner guide.';
      return r;
    }
    if (feeling === 'uncomfortable') {
      r.state = 'rest';
      r.focus = 'Rest today';
      r.summary = 'You feel uncomfortable, so no training today.';
      r.reasons = ['Rest is the right choice today.', 'If it continues or worries you, contact a healthcare professional.'];
      return r;
    }
    const todayRec = NH.todaySession();
    if (todayRec) {
      r.state = 'done';
      r.focus = todayRec.stopped ? 'You stopped early' : 'Done for today';
      r.summary = todayRec.stopped ? 'That’s fine. Rest for today.' : 'Well done. Rest for today.';
      r.reasons = ['One session per day.'];
      return r;
    }
    const firstEver = a.history.length === 0;
    const cap = Math.min(L.days.length, LIM.maxSessionsPerWeek);
    if (!firstEver && (!L.days.includes(t.getDay()) || week.completed >= cap)) {
      const next = NH.nextSessionDate(a);
      r.state = 'rest-day';
      r.focus = 'Rest day';
      r.summary = (week.completed >= cap ? 'This week’s sessions are done.' : 'No session today.') + (next ? ' Next: ' + DAY_LONG[next.getDay()] + '.' : '');
      r.reasons = ['Rest days are part of training.', limitsReason];
      return r;
    }

    // What to practise
    if (L.id === 'starting') {
      r.focus = 'Starting check';
      r.focusDetail = 'Session ' + (a.atLevel.filter((x) => !x.stopped).length + 1) + ' of 3';
      r.summary = 'A short, easy session to find your starting point.';
      r.reasons.push('3 short sessions help NeuroHand learn your starting point.');
    } else {
      const [Lh, Rh] = a.hands;
      const gap = Lh.recent != null && Rh.recent != null ? Lh.recent - Rh.recent : 0;
      if (Math.abs(gap) >= 4) {
        const weak = gap > 0 ? 'right' : 'left';
        r.mix = weak === 'right' ? { left: 0.4, right: 0.6 } : { left: 0.6, right: 0.4 };
        r.focus = (weak === 'right' ? 'Right' : 'Left') + ' hand';
        r.focusDetail = 'More ' + weak + '-hand trials';
        r.summary = 'Your ' + weak + ' hand was recognized less often, so it gets more practice.';
      } else {
        r.focus = 'Both hands';
        r.focusDetail = 'Equal left and right';
        r.summary = 'Both hands are about even.';
      }
      r.reasons.push('Recent recognition: left ' + Lh.recent + '%, right ' + Rh.recent + '%.');
      const lastChange = a.changes[a.changes.length - 1];
      r.reasons.push('Level: ' + L.name + '.' + (lastChange ? ' ' + lastChange.reason : ''));
    }

    // How the user feels
    if (feeling === 'tired') {
      r.sets = Math.max(1, L.sets - 1);
      r.restSeconds = Math.round((L.restSeconds * 1.5) / 5) * 5;
      r.minutes = estMinutes(r.sets, r.trialsPerSet, r.restSeconds);
      r.summary = 'Shorter today because you’re tired.';
      r.reasons.unshift('You feel tired: 1 set fewer, longer rests.');
    } else if (feeling === 'good') {
      r.reasons.unshift('You feel good: full session.');
    } else {
      r.reasons.unshift('Check in to start.');
    }

    r.reasons.push('This week: ' + week.completed + ' of ' + week.planned + ' done.');

    // Signal quality
    const poor = Object.keys(signal).filter((k) => signal[k] === 'poor');
    const fair = Object.keys(signal).filter((k) => signal[k] === 'fair');
    if (poor.length) {
      r.state = 'check-signal';
      r.notices.push({ kind: 'bad', text: poor.join(' and ') + ' signal is poor. Check the headset first.', link: { href: 'device.html', label: 'Check signal' } });
      r.reasons.push('Poor signal makes results unreliable, so they won’t count.');
    } else if (fair.length) {
      r.notices.push({ kind: 'warn', text: fair.join(' and ') + ' signal is fair. Adjust the headset for better results.', link: { href: 'device.html', label: 'Check signal' } });
      r.reasons.push('A fair ' + fair.join(' and ') + ' signal may lower ' + fair.map((k) => HAND_FOR[k]).join(' and ') + ' results.');
    }

    r.reasons.push(limitsReason, adviceReason);
    return r;
  };
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- Shared rendering ----------
  const ICONS = {
    completed: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    stopped: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
    today: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
    upcoming: '<circle cx="12" cy="12" r="7"/>',
    rested: '<path d="M7 12h10"/>',
    rest: '<path d="M7 12h10"/>',
    before: '<path d="M7 12h10"/>',
    warn: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    up: '<path d="m6 14 6-6 6 6"/>',
    down: '<path d="m6 10 6 6 6-6"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3z"/>'
  };
  NH.icon = (name, cls) => '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
  const STATUS = {
    completed: { label: 'Completed', chip: 'ok' },
    stopped: { label: 'Stopped early', chip: 'warn' },
    today: { label: 'Today', chip: 'teal' },
    upcoming: { label: 'Upcoming', chip: '' },
    rested: { label: 'Rested', chip: '' },
    rest: { label: 'Rest day', chip: '' },
    before: { label: 'Before start', chip: '' }
  };
  NH.renderWeek = (el, start, compact, a) => {
    a = a || NH.analyse();
    const t = today();
    const sum = NH.weekSummary(a, start);
    el.innerHTML = sum.days.map((d, i) => {
      const s = sum.statuses[i];
      const isToday = d.getTime() === t.getTime();
      const rec = a.history.filter((x) => x.date === iso(d)).pop();
      let meta = '';
      if (rec) meta = 'L ' + (rec.left == null ? '–' : rec.left + '%') + ' · R ' + (rec.right == null ? '–' : rec.right + '%');
      else if (s === 'today' || s === 'upcoming') meta = 'About ' + a.level.minutes + ' min · ' + a.level.sets + (a.level.sets === 1 ? ' set' : ' sets');
      else if (s === 'rested') meta = 'Rest taken instead';
      const label = NH.longDate(d) + ': ' + STATUS[s].label + (meta ? ', ' + meta : '');
      return '<li class="day is-' + s + (isToday ? ' is-today' : '') + '" aria-label="' + label + '">' +
        '<div class="dhead"><span class="dname">' + DAY_SHORT[d.getDay()] + '</span><span class="ddate">' + d.getDate() + '</span></div>' +
        '<span class="chip ' + STATUS[s].chip + '">' + NH.icon(s) + '<span>' + STATUS[s].label + '</span></span>' +
        (compact ? '' : '<span class="dmeta">' + meta + '</span>') + '</li>';
    }).join('');
    return sum;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const levelTrack = (li) => '<ol class="level-track" aria-label="Plan levels">' + LEVELS.map((l, i) =>
    '<li class="' + (i < li ? 'is-past' : i === li ? 'is-current' : '') + '"' + (i === li ? ' aria-current="step"' : '') + '><span class="lt-dot">' + (i < li ? NH.icon('check') : i + 1) + '</span><span class="lt-name">' + l.name + '</span></li>').join('') + '</ol>';

  // ---------- Every page: check-in radios, demo tags, live signal labels ----------
  function bindCommon() {
    const sync = () => document.querySelectorAll('[data-checkin] input[name="feeling"]').forEach((inp) => { inp.checked = inp.value === NH.getFeeling(); });
    document.querySelectorAll('[data-checkin] input[name="feeling"]').forEach((inp) => {
      inp.addEventListener('change', () => { if (inp.checked) NH.setFeeling(inp.value); });
    });
    sync();
    document.addEventListener('nh:change', sync);
    document.querySelectorAll('[data-demo]').forEach((el) => { el.hidden = NH.HARDWARE_CONNECTED; });
    const sig = NH.getSignal();
    document.querySelectorAll('[data-signal]').forEach((el) => { const q = sig[el.dataset.signal]; el.textContent = q; el.className = 'q-' + q; });
  }
  bindCommon();

  // ---------- Home ----------
  const card = $('today-plan');
  if (card) {
    $('today-date').textContent = NH.longDate(today());
    $('go-demo').addEventListener('click', () => { NH.loadDemo(); document.dispatchEvent(new CustomEvent('nh:change')); });
    $('start-today').addEventListener('click', () => { location.href = 'training.html'; });
    const renderHome = () => {
      const r = NH.recommend();
      const a = r.a;
      const onboard = r.state === 'onboard';
      const training = r.state === 'train' || r.state === 'check-signal';
      card.dataset.state = r.state;
      $('level-chip').hidden = onboard;
      $('level-chip').innerHTML = 'Level: ' + r.level.name;
      $('home-checkin').hidden = onboard;
      $('plan-focus-k').hidden = !training;
      $('plan-focus').textContent = r.focus;
      $('plan-focus-detail').textContent = r.focusDetail;
      $('plan-focus-detail').hidden = !r.focusDetail;
      $('plan-summary').textContent = r.summary;
      $('plan-side').hidden = !training;
      $('plan-min').innerHTML = r.minutes + ' min<small>' + (r.minutes !== r.level.minutes ? 'Usually ' + r.level.minutes + ' min' : 'About') + '</small>';
      $('plan-sets').innerHTML = r.sets + (r.sets === 1 ? ' set' : ' sets') + '<small>× ' + r.trialsPerSet + ' trials</small>';
      $('plan-rest').innerHTML = (r.sets > 1 ? r.restSeconds + ' s' : 'None') + '<small>' + (r.sets > 1 ? 'Between sets' : 'One set') + '</small>';
      $('rest-list').innerHTML = [
        'Stop anytime if tired or uncomfortable'
      ].map((x) => '<li>' + NH.icon('heart') + '<span>' + x + '</span></li>').join('');
      $('plan-notices').innerHTML = r.notices.map((n) =>
        '<div class="notice ' + n.kind + '" role="status">' + NH.icon('warn') + '<div>' + n.text + (n.link ? ' <a href="' + n.link.href + '">' + n.link.label + '</a>' : '') + '</div></div>').join('');
      $('why').hidden = onboard;
      $('why-list').innerHTML = r.reasons.map((x) => '<li>' + x + '</li>').join('');

      $('go-guide').hidden = !onboard; $('go-demo').hidden = !onboard;
      $('start-today').hidden = !training;
      $('check-signal').hidden = r.state !== 'check-signal';
      $('start-today').className = 'btn ' + (r.state === 'check-signal' ? 'btn-ghost' : 'btn-primary');
      $('start-today').disabled = !r.feeling;
      $('start-hint').hidden = !(training && !r.feeling);
      $('week-plan-btn').hidden = onboard;
      $('week-plan-btn').className = 'btn ' + (training ? 'btn-ghost' : 'btn-primary');

      // This week + recent sessions
      $('home-lower').hidden = onboard;
      if (!onboard) {
        const sum = NH.renderWeek($('week-strip'), null, true, a);
        $('week-count').textContent = sum.completed + ' of ' + sum.planned + ' done';
        $('week-meter').style.width = (sum.planned ? Math.round((sum.completed / sum.planned) * 100) : 0) + '%';
        const rows = a.history.map((s, i) => ({ s, n: i + 1 })).slice(-3).reverse();
        $('recent-body').innerHTML = rows.length ? rows.map(({ s, n }) =>
          '<tr><td><strong>Session ' + n + '</strong></td><td>' + NH.shortDate(fromIso(s.date)) + '</td><td class="r tnum">' + (overall(s) == null ? '–' : overall(s) + '%') + (s.stopped ? ' <span class="chip warn">Stopped early</span>' : '') + '</td><td class="r tnum">' + (s.minutes || '–') + ' min</td></tr>').join('')
          : '<tr><td colspan="4" class="subtle">No sessions yet.</td></tr>';
      }
    };
    document.addEventListener('nh:change', renderHome);
    renderHome();
  }

  // ---------- My plan ----------
  const weekEl = $('week');
  if (weekEl) {
    let start = NH.weekStart(today());
    const thisWeek = start.getTime();
    const renderPlan = () => {
      const a = NH.analyse();
      const ob = NH.isOnboarded();
      $('plan-empty').hidden = ob;
      $('plan-main').hidden = !ob;
      if (!ob) return;
      const L = a.level;

      // Level card
      $('level-name').textContent = L.name;
      $('level-about').textContent = L.about;
      $('level-track').innerHTML = levelTrack(a.levelIndex);
      $('level-facts').innerHTML =
        '<div><dt>Per week</dt><dd>' + L.days.length + '<small>' + L.days.map((d) => DAY_SHORT[d]).join(', ') + '</small></dd></div>' +
        '<div><dt>Sets</dt><dd>' + L.sets + '<small>× ' + L.trialsPerSet + ' trials</small></dd></div>' +
        '<div><dt>Rest</dt><dd>' + L.restSeconds + ' s<small>Between sets</small></dd></div>' +
        '<div><dt>Length</dt><dd>' + L.minutes + ' min<small>About</small></dd></div>';
      if (a.next) {
        $('next-title').textContent = 'Next: ' + a.next.target;
        $('next-list').innerHTML = a.next.items.map((it) => '<li class="' + (it.done ? 'is-done' : '') + '">' + NH.icon(it.done ? 'check' : 'upcoming') + '<span>' + it.label + '</span><span class="nv tnum">' + it.value + '</span></li>').join('');
        $('next-note').textContent = a.levelIndex === 0 ? '' : 'Feeling tired or uncomfortable often moves you back a level.';
      } else {
        $('next-title').textContent = 'Highest level';
        $('next-list').innerHTML = '<li class="is-done">' + NH.icon('check') + '<span>Highest level reached.</span></li>';
        $('next-note').textContent = 'Feeling tired or uncomfortable often moves you back a level.';
      }
      $('changes').innerHTML = a.changes.length ? a.changes.slice().reverse().map((c) =>
        '<li>' + NH.icon(c.dir) + '<div><strong>' + c.from + ' → ' + c.to + '</strong> <span class="subtle">' + NH.shortDate(fromIso(c.date)) + '</span><p>' + c.reason + '</p></div></li>').join('')
        : '<li class="subtle">None yet.</li>';

      // Calendar
      const sum = NH.renderWeek(weekEl, start, false, a);
      const end = sum.days[6];
      $('week-range').textContent = sum.days[0].getDate() + ' ' + MONTHS[sum.days[0].getMonth()].slice(0, 3) + ' – ' + end.getDate() + ' ' + MONTHS[end.getMonth()].slice(0, 3) + ' ' + end.getFullYear();
      $('week-this').disabled = start.getTime() === thisWeek;

      // Analysis
      const [Lh, Rh] = a.hands;
      const fmt = (v) => (v == null ? '–' : v + '%');
      const delta = (h) => (h.recent == null || h.base == null || a.valid.length < 4 ? '' : '<small>' + (h.recent - h.base >= 0 ? '+' : '') + (h.recent - h.base) + ' since start</small>');
      $('analysis-stats').innerHTML =
        '<div class="stat"><div class="k">Sessions</div><div class="v">' + a.history.length + '</div><div class="s">' + a.minutesTotal + ' min total</div></div>' +
        '<div class="stat"><div class="k">Left hand</div><div class="v">' + fmt(Lh.recent) + '</div><div class="s">' + (delta(Lh) || 'Recent') + '</div></div>' +
        '<div class="stat"><div class="k">Right hand</div><div class="v">' + fmt(Rh.recent) + '</div><div class="s">' + (delta(Rh) || 'Recent') + '</div></div>' +
        '<div class="stat"><div class="k">Tired days</div><div class="v">' + (a.feelings.tired + a.feelings.uncomfortable) + '</div><div class="s">of ' + a.history.length + ' sessions</div></div>';
      $('analysis-list').innerHTML = NH.insights(a).map((x) => '<li>' + x + '</li>').join('');
    };
    $('week-prev').addEventListener('click', () => { start.setDate(start.getDate() - 7); renderPlan(); });
    $('week-next').addEventListener('click', () => { start.setDate(start.getDate() + 7); renderPlan(); });
    $('week-this').addEventListener('click', () => { start = NH.weekStart(today()); renderPlan(); });

    // Safety limits
    const LIM = NH.LIMITS;
    $('limits').innerHTML = [
      'Max ' + LIM.maxSessionsPerWeek + ' sessions a week',
      'Max ' + LIM.maxMinutes + ' min a session',
      'Max ' + LIM.maxSetsPerSession + ' sets of ' + LIM.maxTrialsPerSet + ' trials',
      'Min ' + LIM.minRestSeconds + ' s rest between sets',
      'No training when uncomfortable'
    ].map((x) => '<li>' + NH.icon('shield') + '<span>' + x + '</span></li>').join('');

    // Your data
    const flash = (id) => { $(id).hidden = false; setTimeout(() => { $(id).hidden = true; }, 2200); };
    $('data-delete').addEventListener('click', () => { $('data-confirm').hidden = false; $('data-delete').hidden = true; $('data-yes').focus(); });
    $('data-no').addEventListener('click', () => { $('data-confirm').hidden = true; $('data-delete').hidden = false; });
    $('data-yes').addEventListener('click', () => { NH.resetAll(); location.href = 'guide.html'; });

    // Demo controls
    const sigSel = $('demo-c4');
    sigSel.value = NH.getSignal().C4;
    sigSel.addEventListener('change', () => { NH.setSignal({ C4: sigSel.value }); flash('demo-saved'); });
    $('demo-load').addEventListener('click', () => { NH.loadDemo(); renderPlan(); flash('demo-saved'); });
    $('demo-checkin').addEventListener('click', () => { NH.setFeeling(null); flash('demo-saved'); });
    $('plan-demo').addEventListener('click', () => { NH.loadDemo(); renderPlan(); });

    document.addEventListener('nh:change', renderPlan);
    renderPlan();
  }

  // ---------- Progress ----------
  const histBody = document.querySelector('#history tbody');
  if (histBody && $('acc-chart')) {
    const a = NH.analyse();
    const h = a.history;
    $('prog-empty').hidden = h.length > 0;
    $('prog-main').hidden = h.length === 0;
    if (h.length) {
      const first = fromIso(h[0].date);
      $('prog-sub').textContent = h.length + (h.length === 1 ? ' session' : ' sessions') + ' since ' + first.getDate() + ' ' + MONTHS[first.getMonth()] + ' ';
      const best = h.reduce((b, s, i) => (overall(s) != null && (b == null || overall(s) > overall(h[b])) ? i : b), null);
      $('prog-stats').innerHTML =
        '<div class="stat"><div class="k">Sessions</div><div class="v">' + h.length + '</div></div>' +
        '<div class="stat"><div class="k">Training time</div><div class="v">' + (a.minutesTotal >= 60 ? Math.floor(a.minutesTotal / 60) + ' h ' + (a.minutesTotal % 60) + ' min' : a.minutesTotal + ' min') + '</div></div>' +
        '<div class="stat"><div class="k">Recent</div><div class="v">' + (a.recentAvg == null ? '–' : a.recentAvg + '%') + ' <small>last 3</small></div></div>' +
        '<div class="stat"><div class="k">Level</div><div class="v">' + a.level.name + '</div></div>';

      // Line chart of overall recognition per session
      const pts = h.map((s, i) => ({ i, v: overall(s), s }));
      const vals = pts.map((p) => p.v).filter((v) => v != null);
      const lo = Math.min(40, Math.floor((Math.min(...vals) - 5) / 10) * 10), hi = Math.max(80, Math.ceil((Math.max(...vals) + 5) / 10) * 10);
      const X0 = 44, X1 = 616, Y0 = 220, Y1 = 24;
      const x = (i) => (h.length === 1 ? (X0 + X1) / 2 : X0 + (i * (X1 - X0)) / (h.length - 1));
      const y = (v) => Y0 - ((v - lo) * (Y0 - Y1)) / (hi - lo);
      let grid = '', axis = '';
      for (let v = lo; v <= hi; v += 10) { grid += '<line x1="44" x2="616" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/>'; axis += '<text x="36" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + v + '%</text>'; }
      const step = Math.ceil(h.length / 10);
      pts.forEach((p) => { if (p.i % step === 0 || p.i === h.length - 1) axis += '<text x="' + x(p.i).toFixed(1) + '" y="242" text-anchor="middle">S' + (p.i + 1) + '</text>'; });
      const good = pts.filter((p) => p.v != null);
      const line = good.map((p, k) => (k ? 'L' : 'M') + x(p.i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
      const area = good.length > 1 ? line + ' L' + x(good[good.length - 1].i).toFixed(1) + ' ' + Y0 + ' L' + x(good[0].i).toFixed(1) + ' ' + Y0 + ' Z' : '';
      const last = good[good.length - 1];
      $('acc-chart').innerHTML = '<g class="grid">' + grid + '</g><g class="axis">' + axis + '</g>' +
        '<line class="chance" x1="44" x2="616" y1="' + y(50).toFixed(1) + '" y2="' + y(50).toFixed(1) + '"/><text class="chance-label" x="616" y="' + (y(50) - 6).toFixed(1) + '" text-anchor="end">Chance level</text>' +
        (area ? '<path class="area" d="' + area + '"/>' : '') + '<path class="line" d="' + line + '"/>' +
        good.map((p, k) => '<circle class="pt' + (k === good.length - 1 ? ' last' : '') + (p.s.signal === 'poor' || p.s.stopped ? ' muted' : '') + '" cx="' + x(p.i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="' + (k === good.length - 1 ? 5 : 3.5) + '"/>').join('') +
        (last ? '<text class="val" x="' + Math.min(x(last.i), 610).toFixed(1) + '" y="' + (y(last.v) - 12).toFixed(1) + '" text-anchor="end">' + last.v + '%</text>' : '');
      $('acc-chart').setAttribute('aria-label', 'Recognition by session, from ' + good[0].v + '% in session 1 to ' + last.v + '% in session ' + (last.i + 1));

      // Left and right: starting check vs recent
      $('lr').innerHTML = a.hands.map((hd) =>
        '<div class="lr-hand"><div class="lr-top"><strong>' + (hd.hand === 'left' ? 'Left' : 'Right') + ' hand</strong><span class="tnum">' + (hd.recent == null ? '–' : hd.recent + '%') + '</span></div>' +
        '<div class="lr-bars"><div class="row"><span>Recent</span><div class="meter"><i style="width:' + (hd.recent || 0) + '%"></i></div><span class="tnum">' + (hd.recent == null ? '–' : hd.recent + '%') + '</span></div>' +
        '<div class="row"><span>At start</span><div class="meter base"><i style="width:' + (hd.base || 0) + '%"></i></div><span class="tnum">' + (hd.base == null ? '–' : hd.base + '%') + '</span></div></div></div>').join('');
      $('prog-insights').innerHTML = NH.insights(a).map((x) => '<li>' + x + '</li>').join('');

      // History table (newest first)
      histBody.innerHTML = h.map((s, i) => ({ s, n: i + 1 })).reverse().map(({ s, n }) =>
        '<tr data-row="' + n + '"><td><strong>Session ' + n + '</strong>' + (s.stopped ? ' <span class="chip warn">Stopped early</span>' : '') + (s.signal === 'poor' ? ' <span class="chip bad">Poor signal</span>' : '') + '</td><td>' + NH.shortDate(fromIso(s.date)) + '</td><td class="r tnum">' + (s.left == null ? '–' : s.left + '%') + '</td><td class="r tnum">' + (s.right == null ? '–' : s.right + '%') + '</td><td class="r tnum"><strong>' + (overall(s) == null ? '–' : overall(s) + '%') + '</strong></td><td class="r tnum">' + (s.minutes || '–') + ' min</td></tr>').join('');
    }
  }

  // ---------- Training page: onboarding and check-in gate ----------
  const tc = $('training-checkin');
  if (tc) {
    const renderTraining = () => {
      const r = NH.recommend();
      const blocked = ['onboard', 'rest', 'rest-day', 'done'].includes(r.state);
      const needCheckin = !r.feeling;
      ['sim-open', 'start-btn'].forEach((id) => { const b = $(id); if (b) b.disabled = blocked || needCheckin; });
      tc.querySelector('[data-checkin]').hidden = r.state === 'onboard';
      $('tc-plan').hidden = blocked || needCheckin;
      $('tc-block').hidden = !blocked;
      $('tc-need').hidden = !needCheckin || blocked;
      if (!blocked) {
        $('tc-plan').innerHTML = '<strong>Today:</strong> ' + r.focus + ' · ' + r.sets + ' × ' + r.trialsPerSet + ' trials · about ' + r.minutes + ' min';
      } else if (r.state === 'onboard') {
        $('tc-block-text').innerHTML = 'Do the beginner guide first. <a href="guide.html">Open guide</a>';
      } else {
        $('tc-block-text').innerHTML = esc(r.summary) + ' <a href="home.html">Back to Home</a>';
      }
    };
    document.addEventListener('nh:change', renderTraining);
    renderTraining();
  }

  // ---------- Beginner guide ----------
  const guide = $('guide');
  if (guide) {
    const steps = Array.from(guide.querySelectorAll('.g-step'));
    let i = 0;
    const show = (n) => {
      i = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach((s, k) => { s.hidden = k !== i; });
      $('g-count').textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      $('g-bar').style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
      $('g-back').hidden = i === 0;
      const last = i === steps.length - 1;
      $('g-next').textContent = last ? 'Finish and go to Home' : 'Next';
      updateNext();
      const h = steps[i].querySelector('h1, h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); }
    };
    const updateNext = () => {
      const s = steps[i];
      const needConsent = s.dataset.step === 'data' && !$('g-consent').checked;
      $('g-next').disabled = needConsent;
      $('g-consent-hint').hidden = !needConsent;
    };
    $('g-consent').addEventListener('change', updateNext);
    $('g-back').addEventListener('click', () => show(i - 1));
    $('g-next').addEventListener('click', () => {
      if (i === steps.length - 1) { NH.completeOnboarding(); location.href = 'home.html'; return; }
      show(i + 1);
    });

    // Practice round: three simulated trials
    const cueEl = $('pr-cue'), subEl = $('pr-sub'), btn = $('pr-start');
    const handsEl = { left: $('pr-left'), right: $('pr-right') };
    let timer = 0;
    btn.addEventListener('click', () => {
      const order = ['left', 'right', 'left'];
      let k = 0;
      btn.disabled = true;
      const run = () => {
        Object.values(handsEl).forEach((el) => { el.style.setProperty('--close', 0); el.closest('.hand-wrap').classList.remove('target'); el.classList.remove('active'); });
        if (k >= order.length) { cueEl.textContent = 'Done!'; subEl.textContent = 'In real sessions, the hand moves when your signal is recognized.'; btn.disabled = false; btn.textContent = 'Practise again'; return; }
        const side = order[k++];
        cueEl.textContent = 'Get ready'; subEl.textContent = 'Trial ' + k + ' of 3';
        timer = setTimeout(() => {
          cueEl.textContent = 'Imagine closing your ' + side + ' hand';
          subEl.textContent = 'Squeeze slowly. Keep your real hand still.';
          const el = handsEl[side]; el.closest('.hand-wrap').classList.add('target');
          const t0 = performance.now();
          const anim = (now) => {
            const p = Math.min(1, (now - t0) / 2400);
            el.style.setProperty('--close', p.toFixed(3));
            if (p >= 0.6) el.classList.add('active');
            if (p < 1) requestAnimationFrame(anim); else timer = setTimeout(() => { subEl.textContent = 'Now relax.'; timer = setTimeout(run, 1200); }, 500);
          };
          requestAnimationFrame(anim);
        }, 1200);
      };
      clearTimeout(timer);
      run();
    });
    show(0);
  }
})();
