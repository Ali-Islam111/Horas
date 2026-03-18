# ==============================================================
# offline_trainer.py  —  Offline Model Trainer
# ==============================================================
#
# Reads the JSON sidecars collected by DatasetCollector and uses
# them to pre-train the IForest and LSTM models between sessions.
#
# WHY THIS MATTERS — The cold-start problem:
#   Currently IForest needs ~2 minutes of live data and LSTM needs
#   ~3 minutes before either model is trained. During that window
#   the system has no anomaly detection at all — exactly when a
#   student might try something knowing the AI isn't watching yet.
#
#   With offline pre-training:
#   - IForest starts already trained on historical normal behaviour
#   - LSTM starts already trained on normal behaviour sequences
#   - Both models are immediately active from frame 1
#   - They still continue to update live, now with a head start
#
# WHAT IT USES:
#   The JSON sidecars saved by DatasetCollector contain the full
#   detector state at each snapshot: head angles, gaze, lip/
#   glow values. These are exactly the same 7 features that IForest
#   and LSTM use at runtime. We don't need the images at all for this.
#
# WHAT IT DOES NOT DO:
#   It does not retrain YOLO, MediaPipe, Whisper, or ArcFace.
#   Those are large pre-trained models — fine-tuning them requires
#   proper labelled datasets and GPU training pipelines. See the
#   YOLO fine-tuning section at the bottom of this file for guidance
#   on when and how to do that separately.
#
# HOW TO RUN:
#   After accumulating sessions in dataset/:
#       python offline_trainer.py
#
#   Or run automatically after every exam session by adding to
#   your web backend's post-session cleanup job.
#
#   Models are saved to saved_models/ and loaded automatically
#   by IForestDetector and LSTMAutoencoder on next startup.
#
# ==============================================================

import os, json, glob, time
import numpy as np

import config

try:
    from sklearn.ensemble      import IsolationForest
    from sklearn.preprocessing import StandardScaler
    import joblib
    _SK = True
except ImportError:
    _SK = False
    print("[Trainer] scikit-learn or joblib not found — IForest training disabled.")

try:
    import tensorflow as tf
    _TF = True
except ImportError:
    _TF = False
    print("[Trainer] TensorFlow not found — LSTM training disabled.")


# ── Paths ────────────────────────────────────────────────────
DATASET_DIR  = os.path.join(config.BASE_DIR, "dataset")
MODELS_DIR   = config.MODELS_DIR

IFOREST_PATH = os.path.join(MODELS_DIR, "iforest_pretrained.joblib")
SCALER_PATH  = os.path.join(MODELS_DIR, "iforest_scaler.joblib")
LSTM_PATH    = os.path.join(MODELS_DIR, "lstm_ae_pretrained.keras")
LSTM_SC_PATH = os.path.join(MODELS_DIR, "lstm_scaler.joblib")


# ── Feature extractor ────────────────────────────────────────
def _extract_vector(detectors: dict) -> np.ndarray | None:
    """
    Extract the same 8-feature vector that build_vector() produces
    at runtime, but from a saved JSON detector state dict.
    Returns None if any required key is missing.
    """
    try:
        head  = detectors.get("head",  {})
        gaze  = detectors.get("gaze",  {})
        lip   = detectors.get("lip",   {})
        glow  = detectors.get("glow",  {})
        vec = np.array([
            head.get("yaw_dev",     0.0),
            head.get("pitch_dev",   0.0),
            head.get("roll_dev",    0.0),
            gaze.get("avg_h",       0.5),
            gaze.get("avg_v",       0.5),
            lip.get("lar",          0.0),
            glow.get("glow_score",  0.0),
        ], dtype=np.float32)
        # Skip vectors with NaN/inf (can happen with bad calibration frames)
        if not np.all(np.isfinite(vec)):
            return None
        return vec
    except Exception:
        return None


# ── Dataset loader ───────────────────────────────────────────
def load_dataset(categories: list[str] = None,
                 max_per_category: int  = 5000) -> tuple[np.ndarray, list[str]]:
    """
    Load all JSON sidecars from the dataset folder.

    categories : list of folder names to load. None = all folders.
    Returns (vectors array of shape [N, 8], labels list of length N).
    """
    if not os.path.exists(DATASET_DIR):
        print(f"[Trainer] Dataset folder not found: {DATASET_DIR}")
        return np.array([]), []

    all_vecs   = []
    all_labels = []
    cats       = categories or os.listdir(DATASET_DIR)

    for cat in cats:
        cat_path = os.path.join(DATASET_DIR, cat)
        if not os.path.isdir(cat_path):
            continue
        jsons = sorted(glob.glob(os.path.join(cat_path, "*.json")))
        if not jsons:
            continue
        # Limit per category to avoid imbalance
        jsons = jsons[:max_per_category]
        loaded = 0
        for jpath in jsons:
            try:
                with open(jpath) as f:
                    meta = json.load(f)
                vec = _extract_vector(meta.get("detectors", {}))
                if vec is not None:
                    all_vecs.append(vec)
                    all_labels.append(cat)
                    loaded += 1
            except Exception:
                continue
        print(f"  [Trainer] {cat:<28} {loaded:>5} vectors loaded")

    if not all_vecs:
        return np.array([]), []
    return np.array(all_vecs), all_labels


# ── IForest trainer ──────────────────────────────────────────
def train_iforest(min_samples: int = 200) -> bool:
    """
    Train IsolationForest on NORMAL frames only.

    We only use 'normal' category because IForest learns what normal
    looks like and flags deviations — feeding it alert frames would
    teach it that cheating is normal.

    Saves: iforest_pretrained.joblib + iforest_scaler.joblib
    These are automatically loaded by IForestDetector on startup.
    """
    if not _SK:
        return False

    print("\n[Trainer] === IForest Training ===")
    vecs, labels = load_dataset(categories=["normal"])

    if len(vecs) < min_samples:
        print(f"[Trainer] Not enough normal samples: {len(vecs)} < {min_samples} required.")
        print(f"          Run more sessions to collect data first.")
        return False

    print(f"[Trainer] Training on {len(vecs)} normal vectors …")
    t0 = time.time()

    scaler = StandardScaler().fit(vecs)
    X      = scaler.transform(vecs)
    model  = IsolationForest(
        contamination = config.IFOREST_CONTAMINATION,
        n_estimators  = 200,       # more trees than live (150) — we have more time offline
        random_state  = 42,
        n_jobs        = -1,
    ).fit(X)

    joblib.dump(model,  IFOREST_PATH)
    joblib.dump(scaler, SCALER_PATH)

    elapsed = time.time() - t0
    scores  = model.score_samples(X)
    print(f"[Trainer] IForest trained in {elapsed:.1f}s")
    print(f"          Score range on training data: {scores.min():.3f} to {scores.max():.3f}")
    print(f"          Saved → {IFOREST_PATH}")
    return True


# ── LSTM trainer ─────────────────────────────────────────────
def train_lstm(min_sequences: int = 100) -> bool:
    """
    Train LSTM Autoencoder on NORMAL frames only.

    Builds sequences of LSTM_SEQ_LEN consecutive frames from the
    normal category. The autoencoder learns to reconstruct normal
    behaviour — high reconstruction error at runtime = anomaly.

    Note: consecutive frames from the same session are grouped
    together to form realistic sequences, rather than mixing random
    frames from different sessions.

    Saves: lstm_ae_pretrained.keras + lstm_scaler.joblib
    """
    if not _TF or not _SK:
        return False

    print("\n[Trainer] === LSTM Autoencoder Training ===")

    # Load normal vectors grouped by session for realistic sequences
    cat_path = os.path.join(DATASET_DIR, "normal")
    if not os.path.exists(cat_path):
        print("[Trainer] No normal/ folder found.")
        return False

    jsons = sorted(glob.glob(os.path.join(cat_path, "*.json")))
    if not jsons:
        print("[Trainer] No JSON files in normal/")
        return False

    # Group by session_id to keep sequences temporally coherent
    by_session: dict[str, list[np.ndarray]] = {}
    for jpath in jsons:
        try:
            with open(jpath) as f:
                meta = json.load(f)
            vec = _extract_vector(meta.get("detectors", {}))
            if vec is None:
                continue
            sid = meta.get("session_id", "unknown")
            by_session.setdefault(sid, []).append(vec)
        except Exception:
            continue

    # Build sequences of LSTM_SEQ_LEN from each session
    sequences = []
    for sid, vecs in by_session.items():
        arr = np.array(vecs)
        for i in range(0, len(arr) - config.LSTM_SEQ_LEN + 1, config.LSTM_SEQ_LEN // 2):
            seq = arr[i : i + config.LSTM_SEQ_LEN]
            if len(seq) == config.LSTM_SEQ_LEN:
                sequences.append(seq)

    if len(sequences) < min_sequences:
        print(f"[Trainer] Not enough sequences: {len(sequences)} < {min_sequences} required.")
        print(f"          Sequences need {config.LSTM_SEQ_LEN} frames each.")
        print(f"          Run more sessions to collect data.")
        return False

    seqs = np.array(sequences)
    print(f"[Trainer] Training on {len(seqs)} sequences from "
          f"{len(by_session)} sessions …")
    t0 = time.time()

    from sklearn.preprocessing import StandardScaler as SS
    scaler = SS().fit(seqs.reshape(-1, config.N_FEATURES))
    X = scaler.transform(
        seqs.reshape(-1, config.N_FEATURES)
    ).reshape(len(seqs), config.LSTM_SEQ_LEN, config.N_FEATURES)

    # Larger model than the live version — we have more time offline
    inp = tf.keras.Input(shape=(config.LSTM_SEQ_LEN, config.N_FEATURES))
    x   = tf.keras.layers.LSTM(128, return_sequences=True)(inp)
    x   = tf.keras.layers.LSTM(64,  return_sequences=False)(x)
    x   = tf.keras.layers.RepeatVector(config.LSTM_SEQ_LEN)(x)
    x   = tf.keras.layers.LSTM(64,  return_sequences=True)(x)
    x   = tf.keras.layers.LSTM(128, return_sequences=True)(x)
    out = tf.keras.layers.TimeDistributed(
            tf.keras.layers.Dense(config.N_FEATURES))(x)
    model = tf.keras.Model(inp, out)
    model.compile(optimizer="adam", loss="mse")

    model.fit(
        X, X,
        epochs          = 60,      # more epochs than live (30) — no time pressure
        batch_size      = 64,
        validation_split= 0.15,
        verbose         = 1,
        callbacks       = [
            tf.keras.callbacks.EarlyStopping(
                patience=8, restore_best_weights=True),
            tf.keras.callbacks.ReduceLROnPlateau(
                patience=4, factor=0.5, verbose=1),
        ],
    )

    model.save(LSTM_PATH)
    joblib.dump(scaler, LSTM_SC_PATH)

    elapsed = time.time() - t0
    recon   = model.predict(X, verbose=0)
    mse     = float(np.mean((X - recon) ** 2))
    print(f"[Trainer] LSTM trained in {elapsed:.1f}s")
    print(f"          Reconstruction MSE on training data: {mse:.5f}")
    print(f"          Suggested LSTM_MSE_THR: {mse * 3:.5f}  "
          f"(3× training MSE — adjust in config.py)")
    print(f"          Saved → {LSTM_PATH}")
    return True


# ── Dataset statistics ───────────────────────────────────────
def dataset_stats():
    """Print a summary of what's in the dataset folder."""
    if not os.path.exists(DATASET_DIR):
        print(f"[Trainer] No dataset folder at {DATASET_DIR}")
        return

    print(f"\n[Trainer] Dataset at {DATASET_DIR}")
    total = 0
    for cat in sorted(os.listdir(DATASET_DIR)):
        cat_path = os.path.join(DATASET_DIR, cat)
        if not os.path.isdir(cat_path):
            continue
        imgs  = len(glob.glob(os.path.join(cat_path, "*.jpg")))
        jsons = len(glob.glob(os.path.join(cat_path, "*.json")))
        if imgs or jsons:
            print(f"  {cat:<28}  {imgs:>5} images  {jsons:>5} JSONs")
            total += imgs
    print(f"  {'TOTAL':<28}  {total:>5} images")


# ── Main ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Offline trainer — pre-trains IForest and LSTM from collected dataset")
    parser.add_argument("--stats",  action="store_true", help="Show dataset stats only")
    parser.add_argument("--iforest",action="store_true", help="Train IForest only")
    parser.add_argument("--lstm",   action="store_true", help="Train LSTM only")
    args = parser.parse_args()

    if args.stats:
        dataset_stats()
    elif args.iforest:
        train_iforest()
    elif args.lstm:
        train_lstm()
    else:
        # Default: train both
        dataset_stats()
        ok_if = train_iforest()
        ok_lstm = train_lstm()
        print(f"\n[Trainer] Done.  IForest: {'✓' if ok_if else '✗'}  "
              f"LSTM: {'✓' if ok_lstm else '✗'}")
        if ok_if or ok_lstm:
            print("[Trainer] Models saved to saved_models/")
            print("          They will be loaded automatically on next session start.")
