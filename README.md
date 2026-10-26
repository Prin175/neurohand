# NeuroHand

A student research prototype for motor-imagery training with visual feedback. The participant wears an EEG headset and imagines closing their left or right hand. When the signal is recognized, a virtual hand on screen closes.

**NeuroHand is not a medical device.** This version uses simulated EEG data.

## Pages

| Page | What it shows |
|---|---|
| `index.html` | Public landing page |
| `login.html` | Log in and sign up (`?mode=signup`) |
| `home.html` | Participant dashboard |
| `training.html` | Training session: check-in, then a **Full screen** session with sets and rest breaks |
| `plan.html` | Weekly plan calendar and the clinician-approved plan settings |
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

## Daily Training Assistant

The Home page shows **Your Training Plan Today**. The user checks in (Feeling good / A little tired / Feeling uncomfortable). The suggestion then adjusts within the clinician-approved plan:

- **Feeling good:** follows the full plan.
- **A little tired:** one set fewer and longer rests.
- **Feeling uncomfortable:** no session. The app suggests resting and contacting the clinician if the discomfort continues.
- The left/right mix shifts toward the hand that was recognized less often recently.
- Poor EEG signal: the app asks the user to check the headset before reading any results.

The assistant never adds sessions, sets or time. The schedule is set on the Weekly plan page and saved in the browser. All results are **DEMO DATA** until `NH.HARDWARE_CONNECTED` in `js/assistant.js` is set to `true` and real data replaces `NH.demo`. Recognition accuracy is not a measure of physical recovery.

## Files

- `css/style.css`: all styles, including light and dark themes
- `js/assistant.js`: Daily Training Assistant (plan, check-in, recommendation, weekly calendar)
- `js/main.js`: page behaviour (menus, login form, device search, training simulation, progress export)
