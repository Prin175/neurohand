# NeuroHand EEG bridge

Connects a real EEG headset to the NeuroHand website and trains the left/right AI.

```
Headset ──► bridge.py ──(ws://localhost:8765)──► NeuroHand website
             │  records calibration trials        shows cues, moves the hand
             └─ trains & runs the AI (CSP + LDA)
```

## 1. Install (once)

Needs Python 3.9 or newer.

```
pip install -r bci/requirements.txt
```

## 2. Try it without a headset

```
python bci/bridge.py --source synthetic
```

This makes fake EEG that reacts to the cues, so you can test everything now.

## 3. Use the website

The bridge only works with the website on **this computer**: open your GitHub Pages site,
or run `python -m http.server` in the project folder and open http://localhost:8000.
(The claude.ai preview can't reach your computer.) Chrome may ask to allow access to
devices on your local network — allow it.

1. **Settings → EEG source → Live headset**
2. **Training** shows "Live EEG · needs calibration". Check in, then press **Calibrate**.
   40 trials (2 sets of 20, about 6 minutes). Imagine squeezing the hand shown.
   The hand doesn't move during calibration.
3. When calibration ends, the AI trains and shows its accuracy (50% = guessing).
4. Press **Start session**. The hand now moves from your own EEG.

Recalibrate at the start of each day or whenever the headset is put on again,
because electrode positions change slightly.

## 4. Connect your headset

**If its software streams over LSL** (Lab Streaming Layer — most research headsets do,
for example OpenBCI GUI, g.tec, BrainProducts, Emotiv with their LSL app):

```
python bci/bridge.py --source lsl
python bci/bridge.py --source lsl --channels C3,Cz,C4   # change if your labels differ
```

**Otherwise**, open `bridge.py`, find `class CustomSource`, and paste in the example
code that came with your headset (connect in `__init__`, return new samples in `read()`).
Then run `python bci/bridge.py --source custom`.

The headset must have electrodes over **C3 and C4** (motor area, top of the head).

## 5. Retrain from several calibrations

Every calibration is saved in `bci/data/`. To train one model from all of them:

```
python bci/train.py
python bci/train.py --demo        # check the pipeline with fake data
python bci/train.py --public 1    # try public dataset BCI Competition IV 2b (pip install moabb)
```

## How the AI works

1. Band-pass filter 8–30 Hz (mu and beta rhythms).
2. **CSP** (Common Spatial Patterns) finds channel combinations where left and right
   imagery differ most. Imagining the left hand lowers rhythm power over C4, the right hand over C3.
3. **LDA** turns that into a probability for left vs. right.
4. The bridge classifies the last 2 seconds of EEG 10 times a second. A trial counts as
   recognized when the average output for the cued hand is 0.6 or higher.

Accuracy is reported with cross-validation on whole trials the model has not seen.

## Privacy

Recordings (`bci/data/`) and models (`bci/models/`) are in `.gitignore`, so they are never
uploaded to GitHub. Keep participant data on the study computer.

Not a medical device.
