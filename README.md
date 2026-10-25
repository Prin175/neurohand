# NeuroHand

A student research prototype for motor-imagery training with visual feedback. The participant wears an EEG headset and imagines closing their left or right hand. When the signal is recognized, a virtual hand on screen closes.

**NeuroHand is not a medical device.** This version uses simulated EEG data.

## Pages

| Page | What it shows |
|---|---|
| `index.html` | Public landing page |
| `login.html` | Log in and sign up (`?mode=signup`) |
| `home.html` | Participant dashboard |
| `training.html` | Training session, with a **Full screen** simulation mode |
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

## Files

- `css/style.css`: all styles, including light and dark themes
- `js/main.js`: page behaviour (menus, login form, device search, training simulation, progress export)
