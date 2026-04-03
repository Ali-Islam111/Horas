# ==============================================================
# offline_trainer.py  —  Offline Model Trainer (V8.0)
# ==============================================================
#
# CHANGES vs V7.5:
#   - train_lstm() now writes the suggested LSTM_MSE_THR to
#     saved_models/tuning_hints.json after every successful training run.
#     config.py reads this file at startup, keeping the threshold in sync
#     with the actual model without requiring a manual edit.
#
#   V7.5 printed the suggested threshold ("Suggested LSTM_MSE_THR: X")
#   but never persisted it — so every new session started with the
#   hard-coded default (500.0) even after retraining produced a model
#   calibrated to a completely different scale.
#
# Everything else retained from V7.5.
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


DATASET_DIR  = os.path.join(config.BASE_DIR, "dataset")
MODELS_DIR   = config.MODELS_DIR

IFOREST_PATH = os.path.join(MODELS_DIR, "iforest_pretrained.joblib")
SCALER_PATH  = os.path.join(MODELS_DIR, "iforest_scaler.joblib")
LSTM_PATH    = os.path.join(MODELS_DIR, "lstm_ae_pretrained.keras")
LSTM_SC_PATH = os.path.join(MODELS_DIR, "lstm_scaler.joblib")


def _extract_vector(detectors: dict) -> np.ndarray | None:
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
        if not np.all(np.isfinite(vec)):
            return None
        return vec
    except Exception:
        return None


def load_dataset(categories: list[str] = None,
                 max_per_category: int  = 5000) -> tuple[np.ndarray, list[str]]:
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
        jsons  = jsons[:max_per_category]
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


def train_iforest(min_samples: int = 200) -> bool:
    if not _SK:
        return False

    print("\n[Trainer] === IForest Training ===")
    vecs, labels = load_dataset(categories=["normal"])

    if len(vecs) < min_samples:
        print(f"[Trainer] Not enough normal samples: {len(vecs)} < {min_samples} required.")
        return False

    print(f"[Trainer] Training on {len(vecs)} normal vectors …")
    t0 = time.time()

    scaler = StandardScaler().fit(vecs)
    X      = scaler.transform(vecs)
    model  = IsolationForest(
        contamination = config.IFOREST_CONTAMINATION,
        n_estimators  = 200,
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


def train_lstm(min_sequences: int = 100) -> bool:
    if not _TF or not _SK:
        return False

    print("\n[Trainer] === LSTM Autoencoder Training ===")

    cat_path = os.path.join(DATASET_DIR, "normal")
    if not os.path.exists(cat_path):
        print("[Trainer] No normal/ folder found.")
        return False

    jsons = sorted(glob.glob(os.path.join(cat_path, "*.json")))
    if not jsons:
        print("[Trainer] No JSON files in normal/")
        return False

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

    sequences = []
    for sid, vecs in by_session.items():
        arr = np.array(vecs)
        for i in range(0, len(arr) - config.LSTM_SEQ_LEN + 1, config.LSTM_SEQ_LEN // 2):
            seq = arr[i : i + config.LSTM_SEQ_LEN]
            if len(seq) == config.LSTM_SEQ_LEN:
                sequences.append(seq)

    if len(sequences) < min_sequences:
        print(f"[Trainer] Not enough sequences: {len(sequences)} < {min_sequences} required.")
        return False

    seqs = np.array(sequences)
    print(f"[Trainer] Training on {len(seqs)} sequences from {len(by_session)} sessions …")
    t0 = time.time()

    from sklearn.preprocessing import StandardScaler as SS
    scaler = SS().fit(seqs.reshape(-1, config.N_FEATURES))
    X = scaler.transform(
        seqs.reshape(-1, config.N_FEATURES)
    ).reshape(len(seqs), config.LSTM_SEQ_LEN, config.N_FEATURES)

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
        epochs           = 60,
        batch_size       = 64,
        validation_split = 0.15,
        verbose          = 1,
        callbacks        = [
            tf.keras.callbacks.EarlyStopping(patience=8, restore_best_weights=True),
            tf.keras.callbacks.ReduceLROnPlateau(patience=4, factor=0.5, verbose=1),
        ],
    )

    model.save(LSTM_PATH)
    joblib.dump(scaler, LSTM_SC_PATH)

    elapsed = time.time() - t0
    recon   = model.predict(X, verbose=0)

    # Anti-lag: compute MSE on last frame only (mirrors runtime behaviour)
    last_true  = X[:, -1, :]
    last_recon = recon[:, -1, :]
    mse        = float(np.mean((last_true - last_recon) ** 2))
    suggested  = mse * 3.0

    print(f"[Trainer] LSTM trained in {elapsed:.1f}s")
    print(f"          Last-frame MSE on training data: {mse:.5f}")
    print(f"          Suggested LSTM_MSE_THR: {suggested:.5f}  (3× training MSE)")
    print(f"          Saved → {LSTM_PATH}")

    # FIX (V8.0): Persist the suggested threshold so config.py can load it
    # at startup. V7.5 only printed this value — the hard-coded default
    # was never updated, causing threshold drift after every retraining run.
    try:
        hints = {}
        if os.path.exists(config.TUNING_HINTS_FILE):
            with open(config.TUNING_HINTS_FILE) as f:
                hints = json.load(f)
        hints["lstm_mse_thr"]          = suggested
        hints["lstm_mse_thr_updated"]  = time.strftime("%Y-%m-%d %H:%M:%S")
        hints["lstm_training_mse"]     = mse
        hints["lstm_sequences_trained"] = len(seqs)
        os.makedirs(os.path.dirname(config.TUNING_HINTS_FILE), exist_ok=True)
        with open(config.TUNING_HINTS_FILE, "w") as f:
            json.dump(hints, f, indent=2)
        print(f"          Tuning hints saved → {config.TUNING_HINTS_FILE}")
        print(f"          (config.py will load LSTM_MSE_THR={suggested:.2f} on next startup)")
    except Exception as e:
        print(f"          Warning: Could not write tuning hints: {e}")

    return True


def dataset_stats():
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


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Offline trainer — pre-trains IForest and LSTM from collected dataset")
    parser.add_argument("--stats",   action="store_true", help="Show dataset stats only")
    parser.add_argument("--iforest", action="store_true", help="Train IForest only")
    parser.add_argument("--lstm",    action="store_true", help="Train LSTM only")
    args = parser.parse_args()

    if args.stats:
        dataset_stats()
    elif args.iforest:
        train_iforest()
    elif args.lstm:
        train_lstm()
    else:
        dataset_stats()
        ok_if   = train_iforest()
        ok_lstm = train_lstm()
        print(f"\n[Trainer] Done.  IForest: {'✓' if ok_if else '✗'}  "
              f"LSTM: {'✓' if ok_lstm else '✗'}")
        if ok_if or ok_lstm:
            print("[Trainer] Models saved to saved_models/")
            print("          They will be loaded automatically on next session start.")
