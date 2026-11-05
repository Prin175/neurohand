"""NeuroHand signal processing: filtering, CSP features and an LDA classifier.

Left vs. right hand motor imagery. Imagining one hand lowers the 8-30 Hz
(mu/beta) power over the opposite side of the motor cortex (C3 for the right
hand, C4 for the left). CSP finds channel mixes where that difference is
largest, and LDA turns the result into a left/right probability.
"""
import pickle

import numpy as np
from scipy.linalg import eigh
from scipy.signal import butter, sosfiltfilt
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.model_selection import StratifiedKFold

BAND = (8.0, 30.0)   # Hz, mu and beta rhythms
WINDOW_S = 2.0       # seconds of EEG used for one decision
LABELS = ("left", "right")


def bandpass(x, fs, band=BAND):
    """Band-pass filter along the last axis (time)."""
    sos = butter(4, [band[0] / (fs / 2), band[1] / (fs / 2)], btype="band", output="sos")
    return sosfiltfilt(sos, x, axis=-1)


class CSP:
    """Common Spatial Patterns for two classes."""

    def __init__(self, n_components=2):
        self.n_components = n_components
        self.filters_ = None

    @staticmethod
    def _cov(trial):
        c = trial @ trial.T
        return c / np.trace(c)

    def fit(self, X, y):
        c0 = np.mean([self._cov(t) for t in X[y == 0]], axis=0)
        c1 = np.mean([self._cov(t) for t in X[y == 1]], axis=0)
        n_ch = c0.shape[0]
        # Small regularisation keeps the solution stable with few channels or trials
        reg = 1e-6 * np.trace(c0 + c1) / n_ch * np.eye(n_ch)
        vals, vecs = eigh(c0 + reg, c0 + c1 + 2 * reg)
        order = np.argsort(vals)
        k = max(1, min(self.n_components, n_ch) // 2)
        pick = np.concatenate([order[:k], order[-k:]])  # both ends of the spectrum
        self.filters_ = vecs[:, pick].T
        return self

    def transform(self, X):
        Z = np.einsum("fc,nct->nft", self.filters_, X)
        var = Z.var(axis=-1)
        return np.log(var / var.sum(axis=1, keepdims=True))


class MotorImageryModel:
    """Band-pass -> CSP -> LDA. Works on windows shaped (channels, samples)."""

    def __init__(self, fs, channels, n_components=2):
        self.fs = fs
        self.channels = list(channels)
        self.csp = CSP(n_components)
        self.lda = LinearDiscriminantAnalysis(solver="lsqr", shrinkage="auto")
        self.accuracy = None
        self.n_trials = {}

    def _features(self, X):
        return self.csp.transform(bandpass(X, self.fs))

    def fit(self, X, y):
        Xf = bandpass(X, self.fs)
        self.csp.fit(Xf, y)
        self.lda.fit(self.csp.transform(Xf), y)
        return self

    def predict_proba(self, window):
        """Probability of (left, right) for one window shaped (channels, samples)."""
        p = self.lda.predict_proba(self._features(window[np.newaxis]))[0]
        return {LABELS[0]: float(p[0]), LABELS[1]: float(p[1])}

    def save(self, path):
        with open(path, "wb") as f:
            pickle.dump(self, f)

    @staticmethod
    def load(path):
        with open(path, "rb") as f:
            return pickle.load(f)


def crop_windows(epochs, fs, window_s=WINDOW_S, step_s=0.5):
    """Cut each trial into overlapping windows the same length the live bridge uses."""
    w, step = int(window_s * fs), int(step_s * fs)
    out = []
    for ep in epochs:
        for start in range(0, ep.shape[-1] - w + 1, step):
            out.append(ep[:, start:start + w])
    per_trial = len(out) // max(1, len(epochs))
    return np.array(out), per_trial


def train(epochs, labels, fs, channels, folds=5, seed=0):
    """Train on trials shaped (n, channels, samples) with labels 0=left, 1=right.

    Returns the fitted model and its cross-validated accuracy on whole trials,
    so windows from the same trial never sit on both sides of a split.
    """
    epochs = np.asarray(epochs, dtype=float)
    labels = np.asarray(labels, dtype=int)
    counts = {LABELS[k]: int((labels == k).sum()) for k in (0, 1)}
    if min(counts.values()) < 5:
        raise ValueError("Need at least 5 trials of each hand, got %s" % counts)

    def windows(idx):
        Xw, per = crop_windows(epochs[idx], fs)
        return Xw, np.repeat(labels[idx], per)

    scores = []
    n_folds = min(folds, min(counts.values()))
    for tr, te in StratifiedKFold(n_folds, shuffle=True, random_state=seed).split(epochs, labels):
        Xtr, ytr = windows(tr)
        m = MotorImageryModel(fs, channels).fit(Xtr, ytr)
        # Score each test trial by averaging its window probabilities
        correct = 0
        for i in te:
            Xw, _ = crop_windows(epochs[i:i + 1], fs)
            p_right = np.mean([m.predict_proba(w)["right"] for w in Xw])
            correct += int((p_right >= 0.5) == bool(labels[i]))
        scores.append(correct / len(te))

    X, y = windows(np.arange(len(epochs)))
    model = MotorImageryModel(fs, channels).fit(X, y)
    model.accuracy = float(np.mean(scores))
    model.n_trials = counts
    return model, model.accuracy


def signal_quality(window):
    """Rough per-channel quality from a short window in microvolts."""
    out = []
    for ch in window:
        sd = float(np.std(ch))
        if sd < 0.5 or sd > 150:
            out.append("poor")      # flat (loose electrode) or huge (movement, bad contact)
        elif sd > 75:
            out.append("fair")
        else:
            out.append("good")
    return out
