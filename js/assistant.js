// NeuroHand Daily Training Assistant
// Plan settings, daily check-in, weekly calendar and the rule-based recommendation.
// The recommendation only works inside the clinician-approved plan: it can make a
// session shorter or change the left/right mix, but it never adds sessions, sets or time.
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
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  NH.today = today;
  NH.longDate = (d) => DAY_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];

  // ---------- Clinician-approved plan ----------
  // Shown as an "example plan" until someone enters the approved plan on the Weekly plan page.
  const EXAMPLE_PLAN = { approvedBy: '', approvedOn: '', days: [1, 2, 3, 4, 5], minutes: 12, sets: 2, trialsPerSet: 10, restSeconds: 60 };
  NH.EXAMPLE_PLAN = EXAMPLE_PLAN;
  NH.getPlan = () => Object.assign({}, EXAMPLE_PLAN, store.get('nh.plan', {}));
  NH.savePlan = (p) => store.set('nh.plan', p);
  NH.resetPlan = () => store.del('nh.plan');
  NH.isApproved = (p) => !!(p.approvedBy && p.approvedBy.trim());

  // ---------- DEMO DATA ----------
  // Recognition accuracy (%) of the last three sessions, newest first. Replace with real results.
  NH.demo = {
    recent: [
      { session: 8, left: 72, right: 66 },
      { session: 7, left: 70, right: 64 },
      { session: 6, left: 66, right: 62 }
    ]
  };
  NH.getSignal = () => Object.assign({ C3: 'good', Cz: 'good', C4: 'fair' }, store.get('nh.demo.signal', {}));
  NH.setSignal = (s) => store.set('nh.demo.signal', s);

  // ---------- Daily check-in ----------
  NH.FEELINGS = { good: 'Feeling good', tired: 'A little tired', uncomfortable: 'Feeling uncomfortable' };
  NH.getFeeling = () => { const c = store.get('nh.checkin', null); return c && c.date === iso(today()) ? c.feeling : null; };
  NH.setFeeling = (f) => {
    if (f) store.set('nh.checkin', { date: iso(today()), feeling: f }); else store.del('nh.checkin');
    document.dispatchEvent(new CustomEvent('nh:checkin', { detail: f }));
  };
  NH.markDoneToday = () => store.set('nh.done', iso(today()));
  NH.doneToday = () => store.get('nh.done', null) === iso(today());

  // ---------- Week ----------
  NH.weekStart = (d) => { const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return s; };
  NH.weekDays = (start) => Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  // completed | rested | today | upcoming | rest
  NH.dayStatus = (date, plan) => {
    const t = today();
    if (!plan.days.includes(date.getDay())) return 'rest';
    if (date.getTime() === t.getTime()) return NH.doneToday() ? 'completed' : 'today';
    if (date > t) return 'upcoming';
    return date.getDate() % 6 === 2 ? 'rested' : 'completed'; // DEMO DATA history
  };
  NH.demoResult = (d) => { const n = d.getDate(); return { left: 60 + (n * 7) % 14, right: 56 + (n * 5) % 13 }; };
  NH.weekSummary = (plan, start) => {
    const days = NH.weekDays(start || NH.weekStart(today()));
    const statuses = days.map((d) => NH.dayStatus(d, plan));
    return { days, statuses, planned: statuses.filter((s) => s !== 'rest').length, completed: statuses.filter((s) => s === 'completed').length };
  };
  NH.nextSession = (plan) => {
    const d = today();
    for (let i = 1; i <= 7; i++) { d.setDate(d.getDate() + 1); if (plan.days.includes(d.getDay())) return new Date(d); }
    return null;
  };

  // ---------- Recommendation ----------
  const HAND_FOR = { C3: 'right-hand', C4: 'left-hand', Cz: 'both-hand' }; // electrode over the opposite motor cortex
  NH.recommend = () => {
    const plan = NH.getPlan();
    const feeling = NH.getFeeling();
    const signal = NH.getSignal();
    const t = today();
    const recent = NH.demo.recent;
    const avg = (k) => Math.round(recent.reduce((a, s) => a + s[k], 0) / recent.length);
    const L = avg('left'), R = avg('right');
    const week = NH.weekSummary(plan);
    const poor = Object.keys(signal).filter((k) => signal[k] === 'poor');
    const fair = Object.keys(signal).filter((k) => signal[k] === 'fair');

    const r = {
      state: 'train', feeling, plan, week, left: L, right: R,
      sets: plan.sets, trialsPerSet: plan.trialsPerSet, restSeconds: plan.restSeconds, minutes: plan.minutes,
      mix: { left: 0.5, right: 0.5 }, focus: '', focusDetail: '', summary: '', reasons: [], notices: []
    };
    const planReason = 'Session length, sets and rest times come from your clinician-approved plan. NeuroHand can make a session shorter, but never longer.';
    const accuracyReason = 'Recognition accuracy shows how often NeuroHand detected the movement you imagined. It does not measure physical recovery of your hand.';
    const demoReason = 'All results here are DEMO DATA. They will come from your own sessions once a real EEG headset is connected.';

    if (!NH.isApproved(plan)) {
      r.notices.push({ kind: 'warn', text: 'This is an example plan, not an approved one. Ask your clinician or research team for your plan, then enter it on the Weekly plan page.', link: { href: 'plan.html#plan-settings', label: 'Enter approved plan' } });
    }

    if (feeling === 'uncomfortable') {
      r.state = 'rest';
      r.focus = 'Rest today';
      r.summary = 'You said you feel uncomfortable, so training is not recommended today.';
      r.reasons = [
        'You told us you feel uncomfortable. Resting is the right choice today.',
        'If the discomfort continues, gets worse, or worries you, contact your clinician or the research team.',
        'A missed session does not need to be made up. You can check in again tomorrow.'
      ];
      return r;
    }
    if (NH.doneToday()) {
      r.state = 'done';
      r.focus = 'Today’s session is done';
      r.summary = 'You finished today’s session. Rest for the rest of the day.';
      r.reasons = ['Your plan has one session per training day. There is nothing more to do today.', accuracyReason];
      return r;
    }
    if (!plan.days.includes(t.getDay())) {
      const next = NH.nextSession(plan);
      r.state = 'rest-day';
      r.focus = 'Rest day';
      r.summary = 'Today is a rest day in your plan.' + (next ? ' Your next session is on ' + DAY_LONG[next.getDay()] + '.' : '');
      r.reasons = ['Your plan has no session on ' + DAY_LONG[t.getDay()] + 's.', 'Rest days are part of training. There is no need to add an extra session.', planReason];
      return r;
    }

    // Left / right focus from recent recognition accuracy
    const gap = L - R;
    if (Math.abs(gap) >= 4) {
      const weak = gap > 0 ? 'right' : 'left';
      const strong = weak === 'right' ? 'left' : 'right';
      r.mix = weak === 'right' ? { left: 0.4, right: 0.6 } : { left: 0.6, right: 0.4 };
      r.focus = (weak === 'right' ? 'Right' : 'Left') + ' hand imagery';
      r.focusDetail = '60% ' + weak + '-hand trials, 40% ' + strong + '-hand trials';
      r.summary = 'Your ' + weak + '-hand imagery was recognized a little less often recently, so today has a few more ' + weak + '-hand trials.';
      r.reasons.push('In your last ' + recent.length + ' sessions, ' + weak + '-hand imagery was recognized ' + Math.min(L, R) + '% of the time and ' + strong + '-hand imagery ' + Math.max(L, R) + '%. Today has a few more ' + weak + '-hand trials so you can practise that side.');
    } else {
      r.focus = 'Left and right hand imagery';
      r.focusDetail = 'Equal number of left- and right-hand trials';
      r.summary = 'Both hands were recognized about equally often recently, so today keeps an even mix.';
      r.reasons.push('In your last ' + recent.length + ' sessions, left-hand imagery was recognized ' + L + '% of the time and right-hand imagery ' + R + '%. The difference is small, so today keeps an even mix.');
    }

    // How the user feels
    if (feeling === 'tired') {
      r.sets = Math.max(1, plan.sets - 1);
      r.restSeconds = Math.round((plan.restSeconds * 1.5) / 5) * 5;
      r.minutes = Math.max(3, Math.round((plan.minutes * r.sets) / plan.sets));
      r.summary = 'You said you feel a little tired, so today is shorter with longer rests. ' + r.summary;
      r.reasons.unshift('You said you feel a little tired, so today has ' + r.sets + ' of your ' + plan.sets + ' planned sets and longer rests. Stop whenever you need to.');
    } else if (feeling === 'good') {
      r.reasons.unshift('You said you feel good, so today follows your full plan.');
    } else {
      r.reasons.unshift('Answer the check-in so the session can match how you feel today.');
    }

    // Sessions this week
    r.reasons.push('You have completed ' + week.completed + ' of ' + week.planned + ' planned sessions this week. Missed sessions do not need to be made up.');

    // Signal quality
    if (poor.length) {
      r.state = 'check-signal';
      r.notices.unshift({ kind: 'bad', text: 'Electrode ' + poor.join(' and ') + ' has a poor signal. Check the headset before you start. Until it is fixed, recognition results are not reliable and should not be compared with earlier sessions.', link: { href: 'device.html', label: 'Check the signal' } });
      r.reasons.push('Electrode ' + poor.join(' and ') + ' has a poor signal. Poor contact can make recognition accuracy look lower than it really is, so check the headset before reading today’s results.');
    } else if (fair.length) {
      const hands = fair.map((k) => HAND_FOR[k]).filter((h, i, a) => a.indexOf(h) === i).join(' and ');
      r.notices.unshift({ kind: 'warn', text: 'Electrode ' + fair.join(' and ') + ' has a fair signal. Adjust the headset before you start. ' + cap(hands) + ' results may read lower than they really are.', link: { href: 'device.html', label: 'Check the signal' } });
      r.reasons.push('Electrode ' + fair.join(' and ') + ' has a fair signal. ' + fair.join(' and ') + ' sits over the area used for ' + hands + ' imagery, so those results may read lower than they really are.');
    }

    r.reasons.push(planReason, accuracyReason);
    if (!NH.HARDWARE_CONNECTED) r.reasons.push(demoReason);
    return r;
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- Shared rendering ----------
  const ICONS = {
    completed: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    today: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
    upcoming: '<circle cx="12" cy="12" r="7"/>',
    rested: '<path d="M7 12h10"/>',
    rest: '<path d="M7 12h10"/>',
    warn: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'
  };
  NH.icon = (name, cls) => '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
  const STATUS = {
    completed: { label: 'Completed', chip: 'ok' },
    today: { label: 'Today', chip: 'teal' },
    upcoming: { label: 'Upcoming', chip: '' },
    rested: { label: 'Rested', chip: '' },
    rest: { label: 'Rest day', chip: '' }
  };
  NH.renderWeek = (el, start, compact) => {
    const plan = NH.getPlan();
    const t = today();
    const sum = NH.weekSummary(plan, start);
    el.innerHTML = sum.days.map((d, i) => {
      const s = sum.statuses[i];
      const isToday = d.getTime() === t.getTime();
      let meta = '';
      if (s === 'completed') {
        if (isToday) meta = 'Done today';
        else { const res = NH.demoResult(d); meta = 'L ' + res.left + '% · R ' + res.right + '%'; }
      } else if (s === 'today' || s === 'upcoming') meta = plan.minutes + ' min · ' + plan.sets + (plan.sets === 1 ? ' set' : ' sets');
      else if (s === 'rested') meta = 'Rest taken instead';
      const label = DAY_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ': ' + STATUS[s].label + (meta ? ', ' + meta : '');
      return '<li class="day is-' + s + (isToday ? ' is-today' : '') + '" aria-label="' + label + '">' +
        '<div class="dhead"><span class="dname">' + DAY_SHORT[d.getDay()] + '</span><span class="ddate">' + d.getDate() + '</span></div>' +
        '<span class="chip ' + STATUS[s].chip + '">' + NH.icon(s) + '<span>' + STATUS[s].label + '</span></span>' +
        (compact ? '' : '<span class="dmeta">' + meta + '</span>') + '</li>';
    }).join('');
    return sum;
  };

  // Check-in radios: any fieldset[data-checkin] on the page
  function bindCheckins() {
    document.querySelectorAll('[data-checkin] input[name="feeling"]').forEach((inp) => {
      inp.checked = inp.value === NH.getFeeling();
      inp.addEventListener('change', () => { if (inp.checked) NH.setFeeling(inp.value); });
    });
    document.addEventListener('nh:checkin', () => {
      document.querySelectorAll('[data-checkin] input[name="feeling"]').forEach((inp) => { inp.checked = inp.value === NH.getFeeling(); });
    });
    document.querySelectorAll('[data-demo]').forEach((el) => { el.hidden = NH.HARDWARE_CONNECTED; });
    // Live signal labels: <span data-signal="C4">
    const sig = NH.getSignal();
    document.querySelectorAll('[data-signal]').forEach((el) => {
      const q = sig[el.dataset.signal];
      el.textContent = q; el.className = 'q-' + q;
    });
  }
  bindCheckins();

  // ---------- Home: Your Training Plan Today ----------
  const card = document.getElementById('today-plan');
  if (card) {
    const $ = (id) => document.getElementById(id);
    $('today-date').textContent = NH.longDate(today());
    const renderHome = () => {
      const r = NH.recommend();
      const training = r.state === 'train' || r.state === 'check-signal';
      card.dataset.state = r.state;
      $('plan-focus').textContent = r.focus;
      $('plan-focus-detail').textContent = r.focusDetail;
      $('plan-focus-detail').hidden = !r.focusDetail;
      $('plan-summary').textContent = r.summary;
      $('plan-stats').hidden = !training;
      $('rest-list').hidden = !training;
      $('plan-min').innerHTML = r.minutes + ' min' + (r.minutes !== r.plan.minutes ? '<small>Plan: ' + r.plan.minutes + ' min</small>' : '<small>About</small>');
      $('plan-sets').innerHTML = r.sets + (r.sets === 1 ? ' set' : ' sets') + '<small>' + r.trialsPerSet + (r.trialsPerSet === 1 ? ' trial' : ' trials') + ' each</small>';
      $('plan-rest').innerHTML = (r.sets > 1 ? r.restSeconds + ' s' : 'None') + '<small>' + (r.sets > 1 ? 'Between sets' : 'Only one set today') + '</small>';
      $('rest-list').innerHTML = [
        r.sets > 1 ? 'Rest for ' + r.restSeconds + ' seconds between sets. Relax your hands and shoulders.' : 'Take a short pause whenever you need one.',
        'You only imagine the movement. Keep your real hands still and relaxed.',
        'Pause or stop at any time. Stop if you feel tired, dizzy or uncomfortable.'
      ].map((t) => '<li>' + NH.icon('heart') + '<span>' + t + '</span></li>').join('');
      $('plan-notices').innerHTML = r.notices.map((n) =>
        '<div class="notice ' + n.kind + '" role="status">' + NH.icon(n.kind === 'info' ? 'info' : 'warn') + '<div>' + n.text + (n.link ? ' <a href="' + n.link.href + '">' + n.link.label + '</a>' : '') + '</div></div>').join('');
      $('why-list').innerHTML = r.reasons.map((t) => '<li>' + t + '</li>').join('');

      const start = $('start-today');
      const checkSig = $('check-signal');
      start.hidden = !training;
      checkSig.hidden = r.state !== 'check-signal';
      start.className = 'btn ' + (r.state === 'check-signal' ? 'btn-ghost' : 'btn-primary');
      start.disabled = !r.feeling;
      $('start-hint').hidden = !(training && !r.feeling);
      $('week-plan-btn').className = 'btn ' + (training ? 'btn-ghost' : 'btn-primary');

      const sum = NH.renderWeek($('week-strip'), null, true);
      $('week-count').textContent = sum.completed + ' of ' + sum.planned + ' completed';
      $('week-meter').style.width = (sum.planned ? Math.round((sum.completed / sum.planned) * 100) : 0) + '%';
    };
    $('start-today').addEventListener('click', () => { location.href = 'training.html'; });
    document.addEventListener('nh:checkin', renderHome);
    renderHome();
  }

  // ---------- Weekly plan page ----------
  const weekEl = document.getElementById('week');
  if (weekEl) {
    const $ = (id) => document.getElementById(id);
    let start = NH.weekStart(today());
    const thisWeek = start.getTime();
    const renderPlanPage = () => {
      const sum = NH.renderWeek(weekEl, start);
      const end = sum.days[6];
      $('week-range').textContent = sum.days[0].getDate() + ' ' + MONTHS[sum.days[0].getMonth()].slice(0, 3) + ' – ' + end.getDate() + ' ' + MONTHS[end.getMonth()].slice(0, 3) + ' ' + end.getFullYear();
      $('week-this').disabled = start.getTime() === thisWeek;
      const rested = sum.statuses.filter((s) => s === 'rested').length;
      const restDays = sum.days.filter((d, i) => sum.statuses[i] === 'rest').map((d) => DAY_SHORT[d.getDay()]);
      const upcoming = sum.statuses.filter((s) => s === 'upcoming' || s === 'today').length;
      $('week-stats').innerHTML =
        '<div class="stat"><div class="k">Completed</div><div class="v">' + sum.completed + ' <small>of ' + sum.planned + '</small></div></div>' +
        '<div class="stat"><div class="k">Still to come</div><div class="v">' + upcoming + '</div></div>' +
        '<div class="stat"><div class="k">Rested instead</div><div class="v">' + rested + '</div></div>' +
        '<div class="stat"><div class="k">Rest days</div><div class="v"><small>' + (restDays.join(', ') || 'None') + '</small></div></div>';
    };
    $('week-prev').addEventListener('click', () => { start.setDate(start.getDate() - 7); renderPlanPage(); });
    $('week-next').addEventListener('click', () => { start.setDate(start.getDate() + 7); renderPlanPage(); });
    $('week-this').addEventListener('click', () => { start = NH.weekStart(today()); renderPlanPage(); });

    // Plan settings form
    const form = $('plan-form');
    const fill = () => {
      const p = NH.getPlan();
      $('approved-by').value = p.approvedBy; $('approved-on').value = p.approvedOn;
      $('p-minutes').value = p.minutes; $('p-sets').value = p.sets; $('p-trials').value = p.trialsPerSet; $('p-rest').value = p.restSeconds;
      form.querySelectorAll('input[name="day"]').forEach((c) => { c.checked = p.days.includes(Number(c.value)); });
      const ok = NH.isApproved(p);
      $('plan-status').className = 'chip ' + (ok ? 'ok' : 'warn');
      $('plan-status').innerHTML = NH.icon(ok ? 'check' : 'warn') + '<span>' + (ok ? 'Approved by ' + escapeHtml(p.approvedBy) + (p.approvedOn ? ' on ' + p.approvedOn : '') : 'Example plan, not yet approved') + '</span>';
      $('sessions-per-week').textContent = p.days.length;
    };
    form.addEventListener('change', () => { $('sessions-per-week').textContent = form.querySelectorAll('input[name="day"]:checked').length; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = $('plan-error');
      const days = Array.from(form.querySelectorAll('input[name="day"]:checked')).map((c) => Number(c.value));
      const num = (id, min, max) => { const v = Math.round(Number($(id).value)); return v >= min && v <= max ? v : NaN; };
      const p = { approvedBy: $('approved-by').value.trim(), approvedOn: $('approved-on').value, days,
        minutes: num('p-minutes', 3, 60), sets: num('p-sets', 1, 6), trialsPerSet: num('p-trials', 4, 40), restSeconds: num('p-rest', 15, 300) };
      let msg = '';
      if (!p.approvedBy) msg = 'Enter the name of the clinician who approved this plan.';
      else if (!days.length) msg = 'Choose at least one training day.';
      else if ([p.minutes, p.sets, p.trialsPerSet, p.restSeconds].some(isNaN)) msg = 'Check the numbers: session length 3–60 min, sets 1–6, trials per set 4–40, rest 15–300 s.';
      err.textContent = msg; err.hidden = !msg;
      if (msg) return;
      NH.savePlan(p); fill(); renderPlanPage();
      $('plan-saved').hidden = false; setTimeout(() => { $('plan-saved').hidden = true; }, 2500);
    });
    $('plan-reset').addEventListener('click', () => { NH.resetPlan(); fill(); renderPlanPage(); $('plan-error').hidden = true; });

    // Demo controls
    const sigSel = $('demo-c4');
    sigSel.value = NH.getSignal().C4;
    sigSel.addEventListener('change', () => { NH.setSignal({ C4: sigSel.value }); $('demo-saved').hidden = false; setTimeout(() => { $('demo-saved').hidden = true; }, 2000); });
    $('demo-clear').addEventListener('click', () => { NH.setFeeling(null); try { localStorage.removeItem('nh.done'); localStorage.removeItem('nh.demo.signal'); } catch (e) { /* ignore */ } sigSel.value = 'fair'; renderPlanPage(); $('demo-saved').hidden = false; setTimeout(() => { $('demo-saved').hidden = true; }, 2000); });

    fill(); renderPlanPage();
  }

  // ---------- Training page: check-in gate and plan summary ----------
  const tc = document.getElementById('training-checkin');
  if (tc) {
    const $ = (id) => document.getElementById(id);
    const renderTraining = () => {
      const r = NH.recommend();
      const blocked = r.state === 'rest' || r.state === 'rest-day' || r.state === 'done';
      const needCheckin = !r.feeling;
      ['sim-open', 'start-btn'].forEach((id) => { const b = $(id); if (b) b.disabled = blocked || needCheckin; });
      $('tc-plan').hidden = blocked || needCheckin;
      $('tc-block').hidden = !blocked;
      $('tc-need').hidden = !needCheckin || blocked;
      if (!blocked) {
        $('tc-plan').innerHTML = '<strong>Today:</strong> ' + r.focus + ' · ' + r.sets + (r.sets === 1 ? ' set' : ' sets') + ' of ' + r.trialsPerSet + (r.trialsPerSet === 1 ? ' trial' : ' trials') + (r.sets > 1 ? ' · ' + r.restSeconds + ' s rest between sets' : '') + ' · about ' + r.minutes + ' min';
      } else {
        $('tc-block-text').textContent = r.summary + (r.state === 'rest' ? ' If the discomfort continues, contact your clinician or the research team.' : '');
      }
    };
    document.addEventListener('nh:checkin', renderTraining);
    renderTraining();
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
})();
