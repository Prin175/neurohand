# NeuroHand

A student research prototype for motor-imagery training with visual feedback. The participant wears an EEG headset and imagines closing their left or right hand. When the signal is recognized, a virtual hand on screen closes.

**NeuroHand is not a medical device.** This version uses simulated EEG data.

## Pages

| Page | What it shows |
|---|---|
| `index.html` | Public landing page |
| `login.html` | Log in and sign up (`?mode=signup`) |
| `home.html` | Participant dashboard |
| `training.html` | Check-in, then **Start session** opens the full-screen session with sets and rest breaks |
| `guide.html` | Beginner guide for new users |
| `settings.html` | Color mode (Light / Dark / Walnut / System), language (English / Thai) and text size |
| `plan.html` | My plan: level, next step, weekly calendar, analysis, safety limits |
| `progress.html` | Session history, charts and CSV export |
| `device.html` | Headset pairing (simulated) |

## Run it

It is a static site with no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000.

## Full-screen simulation

On the Training page, press **Full screen**. Trials loop through rest, cue, imagery and feedback. Press Space or tap to pause and Esc to exit.

## Beginner guide and personal plan

New users start with the **beginner guide** (`guide.html`): what motor imagery is, how to wear the headset, how to stay safe, consent to save training data, and a short practice round. Sign-up leads straight to it.

After each session NeuroHand saves the recognition rate for each hand, session length, the check-in answer, signal quality and whether the user stopped early. The **My plan** page (`plan.html`) analyses this and sets a level:

| Level | Sessions a week | Each session | Moves up when |
|---|---|---|---|
| Starting check | 3 | 2 sets × 8 trials | 3 sessions are done |
| Beginner | 3 | 2 sets × 10 trials | 3 sessions average 60%+ with no tiredness or poor signal |
| Building | 4 | 3 sets × 10 trials | 3 sessions average 68%+ with no tiredness or poor signal |
| Steady | 5 | 3 sets × 12 trials | Highest level |

The plan moves down a level after a report of feeling uncomfortable, or tiredness or early stops in 2 of 3 sessions. Every day the user checks in. "A little tired" means one set fewer and longer rests, and "Feeling uncomfortable" means no session. The left/right mix leans toward the hand recognized less often. Results from poor-signal sessions are left out of the analysis.

**Safety limits** in `NH.LIMITS` (`js/assistant.js`) can never be exceeded: at most 5 sessions a week, 20 minutes a session, 3 sets of 12 trials, and at least 45 s of rest between sets. The plan is a training suggestion, not medical advice.

Data is saved in the browser (localStorage) and labelled **DEMO DATA** until `NH.HARDWARE_CONNECTED` is set to `true`. "Explore with demo data" loads 8 example sessions. Recognition accuracy is not a measure of physical recovery.

## Files

- `css/style.css`: all styles, including light and dark themes
- `js/assistant.js`: Daily Training Assistant (session history, analysis, levels, safety limits, check-in, guide)
- `js/i18n.js`: Thai translations. English is written in the pages; when Thai is chosen, text is translated on the fly, including text the app updates. Add new strings to the `D` dictionary (or a pattern in `P` if the text contains numbers).
- `js/main.js`: page behaviour (menus, login form, device search, training simulation, progress export)
