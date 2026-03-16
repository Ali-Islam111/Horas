# ==============================================================
# detectors/anomaly.py  —  Isolation Forest + LSTM Autoencoder
# ==============================================================
#
# Fixes vs GitHub version:
#   - IForest: added _training flag to prevent multiple concurrent
#     training threads from spawning between trigger and completion
#   - LSTM: same _training flag fix — critical, LSTM trains for
#     ~30 epochs so without this flag 30+ threads can stack up
# ==============================================================

import os, time, threading, numpy as np
import config

try:
    from sklearn.ensemble       import IsolationForest
    from sklearn.preprocessing  import StandardScaler
    _SK = True
except ImportError:
    _SK = False
    print("[Anomaly] scikit-learn not found — IForest disabled.")

try:
    import tensorflow as tf
    _TF = True
except ImportError:
    _TF = False
    print("[Anomaly] TensorFlow not found — LSTM Autoencoder disabled.")


# ── Feature builder ──────────────────────────────────────────
def build_vector(head: dict, gaze: dict, lip: dict,
                 glow: dict) -> np.ndarray:
    """Assemble one N_FEATURES-dim vector from detector outputs."""
    return np.array([
        head.get("yaw_dev",     0.0),
        head.get("pitch_dev",   0.0),
        head.get("roll_dev",    0.0),
        gaze.get("avg_h",       0.5),
        gaze.get("avg_v",       0.5),
        lip.get("lar",          0.0),
        glow.get("glow_score",  0.0),
    ], dtype=np.float32)


# ── Isolation Forest ─────────────────────────────────────────
class IForestDetector:
    """
    Phase 1 (warm-up): collects IFOREST_WARMUP feature vectors (~2 min).
    Phase 2 (trained): scores every new vector in real-time.
                       Retrains in background every IFOREST_RETRAIN_EVERY ticks.

    IMPROVEMENT: Pre-trained model loading.
    If offline_trainer.py has been run after previous sessions, a pre-trained
    model exists in saved_models/. Loading it means the detector is fully
    active from frame 1 — no cold-start window where anomalies go undetected.
    The live data still accumulates and the model still retrains periodically,
    so it adapts to the current student on top of the historical baseline.
    """
    def __init__(self):
        self._buf:     list[np.ndarray] = []
        self._model    = None
        self._scaler   = None
        self._trained  = False
        self._training = False
        self._ticks    = 0
        self._lock     = threading.Lock()

        # Try to load a pre-trained model from offline_trainer.py
        self._try_load_pretrained()

    def _try_load_pretrained(self):
        """Load pre-trained IForest from disk if available."""
        if not _SK:
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

        # Trigger initial training — only if not already training or trained
        if (not self._trained and not self._training and
                len(self._buf) >= config.IFOREST_WARMUP and _SK):
            self._training = True       # ← set BEFORE spawning thread
            threading.Thread(target=self._train, daemon=True).start()

        # Periodic retrain — only one thread at a time
        if (self._trained and not self._training and _SK and
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
            with self._lock:
                data = np.array(self._buf.copy())
            scaler = StandardScaler().fit(data)
            X      = scaler.transform(data)
            model  = IsolationForest(
                contamination = config.IFOREST_CONTAMINATION,
                n_estimators  = 150,
                random_state  = 42,
                n_jobs        = -1,
            ).fit(X)
            with self._lock:
                self._model, self._scaler, self._trained = model, scaler, True
            print(f"  [IForest] Trained on {len(data)} samples.")
        finally:
            self._training = False      # ← always release guard, even on error


# ── LSTM Autoencoder ─────────────────────────────────────────
class LSTMAutoencoder:
    """
    Learns temporal patterns of NORMAL behaviour during warm-up.
    After training, sequences with high reconstruction error are anomalous.

    IMPROVEMENT: Pre-trained model loading.
    If offline_trainer.py has been run, a better pre-trained model exists
    (60 epochs, 128-unit LSTM vs the live 30-epoch 64-unit version).
    Loading it eliminates the ~3-minute cold-start window entirely.

    FIX: _training flag prevents stacked concurrent training threads.
    IMPROVEMENT: Inference batching (LSTM_INFER_BATCH_SIZE).
    """
    def __init__(self):
        self._seq_buf:   list[np.ndarray] = []
        self._seqs:      list[np.ndarray] = []
        self._model      = None
        self._scaler     = None
        self._trained    = False
        self._training   = False
        self._lock       = threading.Lock()
        self._infer_buf: list[np.ndarray] = []
        self._last_mse:  float | None     = None
        self._last_anom: bool             = False

        # Try to load a pre-trained model from offline_trainer.py
        self._try_load_pretrained()

    def _try_load_pretrained(self):
        """Load pre-trained LSTM from disk if available."""
        if not _TF or not _SK:
            return
        lstm_path  = os.path.join(config.MODELS_DIR, "lstm_ae_pretrained.keras")
        scaler_path= os.path.join(config.MODELS_DIR, "lstm_scaler.joblib")
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
            seq = np.array(self._seq_buf[-config.LSTM_SEQ_LEN:])
            with self._lock:
                self._seqs.append(seq)

        # Trigger training — only once, only if not already running
        if (not self._trained and not self._training and _TF and _SK and
                len(self._seqs) >= config.LSTM_WARMUP_SEQS):
            self._training = True
            threading.Thread(target=self._train, daemon=True).start()

        if not self._trained or len(self._seq_buf) < config.LSTM_SEQ_LEN:
            return {"trained": False, "mse": None, "anomaly": False}

        # IMPROVEMENT: Batch inference — accumulate sequences, predict every N frames
        seq = np.array(self._seq_buf[-config.LSTM_SEQ_LEN:])
        self._infer_buf.append(seq)

        if len(self._infer_buf) < config.LSTM_INFER_BATCH_SIZE:
            # Return cached result from last batch — still fresh enough
            return {"trained": True,
                    "mse":     self._last_mse,
                    "anomaly": self._last_anom}

        # Run batch predict — amortizes TF overhead across LSTM_INFER_BATCH_SIZE frames
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
            
            # ── ANTI-LAG FIX ──────────────────────────────────────────
            # Previously, the MSE was calculated across the entire 30-frame sequence.
            # This meant a brief 1-second anomaly would remain in the sliding window
            # for 30 frames, causing the alert to "stick" and lag.
            # Now, we only calculate reconstruction error on the LAST frame of the sequence.
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
            with self._lock:
                seqs = np.array(self._seqs.copy())
            from sklearn.preprocessing import StandardScaler as SS
            scaler = SS().fit(seqs.reshape(-1, config.N_FEATURES))
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
            self._training = False      # ← always release guard
