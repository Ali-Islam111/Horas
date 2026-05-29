# ==============================================================
# detectors/anomaly.py  —  Isolation Forest + LSTM Autoencoder (V9.0)
# ==============================================================
#
# FIX (V9.0) — Lazy TensorFlow import:
#   Previously: import tensorflow as tf  at module level → 3-8 second
#               import penalty every time proctoring_session was imported.
#   Now: tensorflow is imported inside _train() / _try_load_pretrained()
#        only when actually needed. The module import is instant.
#
# FIX (V9.0) — Lazy sklearn import:
#   Same pattern. sklearn imported inside methods, not at module level.
#
# Retained from V8.0:
#   - _training guard flags (prevents concurrent training threads)
#   - Pre-trained model loading (active from frame 1 if available)
#   - LSTM anti-lag fix (last-frame-only MSE)
#   - Inference batching (LSTM_INFER_BATCH_SIZE)
#   - Rate-gating via ANOMALY_EVERY in the main loop
# ==============================================================

import os, time, threading, numpy as np
from collections import deque
import config

# ── Cached lazy imports ───────────────────────────────────────
# sklearn is imported once on first use and cached here.
# Calling _try_import_sklearn() every frame (30fps) adds ~1-2ms of function-
# call overhead even though Python caches the module; caching the result at
# module level eliminates that cost entirely.
_SKLEARN_CACHE: tuple = (None, None)   # (IsolationForest, StandardScaler) | (None, None)
_SKLEARN_TRIED: bool  = False


def build_vector(head: dict, gaze: dict, lip: dict) -> np.ndarray:
    """Assemble one N_FEATURES-dim vector from detector outputs."""
    return np.array([
        head.get("yaw_dev",     0.0),
        head.get("pitch_dev",   0.0),
        head.get("roll_dev",    0.0),
        gaze.get("avg_h",       0.5),
        gaze.get("avg_v",       0.5),
        lip.get("lar",          0.0),
    ], dtype=np.float32)


def _try_import_sklearn():
    """Lazy import — returns (IsolationForest, StandardScaler) or (None, None).
    Result is cached after the first call to avoid per-frame import overhead."""
    global _SKLEARN_CACHE, _SKLEARN_TRIED
    if _SKLEARN_TRIED:
        return _SKLEARN_CACHE
    _SKLEARN_TRIED = True
    try:
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler
        _SKLEARN_CACHE = (IsolationForest, StandardScaler)
    except ImportError:
        print("[Anomaly] scikit-learn not found — IForest disabled.")
        _SKLEARN_CACHE = (None, None)
    return _SKLEARN_CACHE


def _try_import_tf():
    """Lazy import — returns tf module or None."""
    try:
        import tensorflow as tf
        return tf
    except ImportError:
        print("[Anomaly] TensorFlow not found — LSTM Autoencoder disabled.")
        return None


class IForestDetector:
    def __init__(self):
        self._buf:     list[np.ndarray] = []
        self._model    = None
        self._scaler   = None
        self._trained  = False
        self._training = False
        self._ticks    = 0
        self._lock     = threading.Lock()
        self._try_load_pretrained()

    def _try_load_pretrained(self):
        IForest, StandardScaler = _try_import_sklearn()
        if IForest is None:
            return
        iforest_path = os.path.join(config.MODELS_DIR, "iforest_pretrained.joblib")
        scaler_path  = os.path.join(config.MODELS_DIR, "iforest_scaler.joblib")
        if os.path.exists(iforest_path) and os.path.exists(scaler_path):
            try:
                import joblib
                model  = joblib.load(iforest_path)
                scaler = joblib.load(scaler_path)
                with self._lock:
                    self._model, self._scaler, self._trained = model, scaler, True
                print("  [IForest] Loaded pre-trained model — active from frame 1.")
            except Exception as e:
                print(f"  [IForest] Could not load pre-trained model: {e}")

    def update(self, vec: np.ndarray) -> dict:
        self._ticks += 1
        with self._lock:
            self._buf.append(vec.copy())

        IForest, _ = _try_import_sklearn()
        if (not self._trained and not self._training and
                IForest and len(self._buf) >= config.IFOREST_WARMUP):
            self._training = True
            threading.Thread(target=self._train, daemon=True).start()

        if (self._trained and not self._training and IForest and
                self._ticks % config.IFOREST_RETRAIN_EVERY == 0):
            self._training = True
            threading.Thread(target=self._train, daemon=True).start()

        if not self._trained:
            return {"trained": False, "score": None, "anomaly": False}

        with self._lock:
            model, scaler = self._model, self._scaler
        scaled = scaler.transform(vec.reshape(1, -1))
        score  = float(model.score_samples(scaled)[0])
        return {"trained": True, "score": score,
                "anomaly": score < config.IFOREST_ANOMALY_THR}

    def _train(self):
        try:
            IForest, StandardScaler = _try_import_sklearn()
            if IForest is None:
                return
            with self._lock:
                data = np.array(self._buf.copy())
            scaler = StandardScaler().fit(data)
            X      = scaler.transform(data)
            model  = IForest(
                contamination = config.IFOREST_CONTAMINATION,
                n_estimators  = 150,
                random_state  = 42,
                n_jobs        = -1,
            ).fit(X)
            with self._lock:
                self._model, self._scaler, self._trained = model, scaler, True
            print(f"  [IForest] Trained on {len(data)} samples.")
        finally:
            self._training = False


class LSTMAutoencoder:
    def __init__(self):
        self._seq_buf:   deque = deque(maxlen=config.LSTM_SEQ_LEN)  # bounded — old entries auto-discarded
        self._seqs:      list[np.ndarray] = []
        self._model      = None
        self._scaler     = None
        self._trained    = False
        self._training   = False
        self._lock       = threading.Lock()
        self._infer_buf: list[np.ndarray] = []
        self._last_mse:  float | None     = None
        self._last_anom: bool             = False
        self._try_load_pretrained()

    def _try_load_pretrained(self):
        tf = _try_import_tf()
        _, StandardScaler = _try_import_sklearn()
        if tf is None or StandardScaler is None:
            return
        lstm_path   = os.path.join(config.MODELS_DIR, "lstm_ae_pretrained.keras")
        scaler_path = os.path.join(config.MODELS_DIR, "lstm_scaler.joblib")
        if os.path.exists(lstm_path) and os.path.exists(scaler_path):
            try:
                import joblib
                model  = tf.keras.models.load_model(lstm_path)
                scaler = joblib.load(scaler_path)
                with self._lock:
                    self._model, self._scaler, self._trained = model, scaler, True
                print("  [LSTM] Loaded pre-trained model — active from frame 1.")
            except Exception as e:
                print(f"  [LSTM] Could not load pre-trained model: {e}")

    def update(self, vec: np.ndarray) -> dict:
        self._seq_buf.append(vec.copy())

        if len(self._seq_buf) >= config.LSTM_SEQ_LEN:
            seq = np.array(self._seq_buf)  # deque is already maxlen=LSTM_SEQ_LEN
            with self._lock:
                self._seqs.append(seq)

        tf = _try_import_tf()
        _, StandardScaler = _try_import_sklearn()
        if (not self._trained and not self._training and tf and StandardScaler and
                len(self._seqs) >= config.LSTM_WARMUP_SEQS):
            self._training = True
            threading.Thread(target=self._train, daemon=True).start()

        if not self._trained or len(self._seq_buf) < config.LSTM_SEQ_LEN:
            return {"trained": False, "mse": None, "anomaly": False}

        seq = np.array(self._seq_buf)  # deque is already maxlen=LSTM_SEQ_LEN
        self._infer_buf.append(seq)

        if len(self._infer_buf) < config.LSTM_INFER_BATCH_SIZE:
            return {"trained": True,
                    "mse":     self._last_mse,
                    "anomaly": self._last_anom}

        batch = np.array(self._infer_buf)
        self._infer_buf.clear()

        with self._lock:
            model, scaler = self._model, self._scaler
        if model is None:
            return {"trained": False, "mse": None, "anomaly": False}

        try:
            scaled = scaler.transform(
                batch.reshape(-1, config.N_FEATURES)
            ).reshape(len(batch), config.LSTM_SEQ_LEN, config.N_FEATURES)
            recon = model.predict(scaled, verbose=0)
            last_step_true  = scaled[:, -1, :]
            last_step_recon = recon[:, -1, :]
            mse = float(np.mean((last_step_true - last_step_recon) ** 2))
            self._last_mse  = mse
            self._last_anom = mse > config.LSTM_MSE_THR
        except Exception as e:
            print(f"  [LSTM] Inference error: {e}")

        return {"trained": True, "mse": self._last_mse, "anomaly": self._last_anom}

    def _train(self):
        try:
            tf = _try_import_tf()
            _, StandardScaler = _try_import_sklearn()
            if tf is None or StandardScaler is None:
                return
            with self._lock:
                seqs = np.array(self._seqs.copy())
            scaler = StandardScaler().fit(seqs.reshape(-1, config.N_FEATURES))
            X = scaler.transform(
                seqs.reshape(-1, config.N_FEATURES)
            ).reshape(len(seqs), config.LSTM_SEQ_LEN, config.N_FEATURES)

            inp = tf.keras.Input(shape=(config.LSTM_SEQ_LEN, config.N_FEATURES))
            x   = tf.keras.layers.LSTM(64, return_sequences=True)(inp)
            x   = tf.keras.layers.LSTM(32, return_sequences=False)(x)
            x   = tf.keras.layers.RepeatVector(config.LSTM_SEQ_LEN)(x)
            x   = tf.keras.layers.LSTM(32, return_sequences=True)(x)
            x   = tf.keras.layers.LSTM(64, return_sequences=True)(x)
            out = tf.keras.layers.TimeDistributed(
                    tf.keras.layers.Dense(config.N_FEATURES))(x)
            model = tf.keras.Model(inp, out)
            model.compile(optimizer="adam", loss="mse")
            model.fit(X, X, epochs=30, batch_size=32,
                      validation_split=0.1, verbose=0,
                      callbacks=[tf.keras.callbacks.EarlyStopping(
                          patience=5, restore_best_weights=True)])

            path = os.path.join(config.MODELS_DIR, "lstm_ae.keras")
            model.save(path)
            with self._lock:
                self._model, self._scaler, self._trained = model, scaler, True
            print(f"  [LSTM] Trained on {len(seqs)} sequences → {path}")
        except Exception as e:
            print(f"  [LSTM] Training error: {e}")
        finally:
            self._training = False
