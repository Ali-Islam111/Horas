# ==============================================================
# detectors/identity.py  —  ArcFace Identity Verification
# ==============================================================
#
# Requires: deepface>=0.0.93  +  tf-keras>=2.15.0
#           (both listed in requirements.txt)
#
# If deepface fails to import, main.py uses a safe stub automatically.
#
# How it works:
#   1. Enrollment: captures ID_REF_FRAMES photos at session start,
#      computes an average ArcFace embedding, saves to REF_DIR.
#   2. Verification: every ID_CHECK_EVERY seconds, computes the
#      current frame's embedding and measures cosine distance to
#      the enrollment embedding. Distance > ID_THRESHOLD → mismatch.
# ==============================================================

import os, cv2, time, numpy as np
import config

try:
    from deepface import DeepFace
    _DF = True
except Exception as e:
    _DF = False
    print(f"  [Identity] deepface not available: {e}")


class IdentityVerifier:
    def __init__(self, session_id: str):
        self.session_id      = session_id
        self.enrolled        = False
        self.reference_image: "str | None" = None
        self.last_result:     dict         = {}
        self._ref_embedding  = None

    # ── Enrollment ───────────────────────────────────────────
    def enroll(self, frames: list) -> bool:
        if not _DF or not frames:
            return False
        embeddings = []
        ref_path   = os.path.join(config.REF_DIR, f"{self.session_id}_ref.jpg")
        for frame in frames:
            try:
                result = DeepFace.represent(
                    img_path     = frame,
                    model_name   = config.ID_MODEL,
                    detector_backend = config.ID_BACKEND,
                    enforce_detection = False,
                )
                if result:
                    embeddings.append(np.array(result[0]["embedding"]))
            except Exception as e:
                print(f"  [Identity] Enrollment frame error: {e}")

        if not embeddings:
            print("  [Identity] No face found during enrollment.")
            return False

        self._ref_embedding  = np.mean(embeddings, axis=0)
        self._ref_embedding /= (np.linalg.norm(self._ref_embedding) + 1e-6)

        # Save middle frame as reference image for PDF
        cv2.imwrite(ref_path, frames[len(frames) // 2])
        self.reference_image = ref_path
        self.enrolled        = True
        print(f"  [Identity] Enrolled from {len(embeddings)} frames → {ref_path}")
        return True

    # ── Verification ─────────────────────────────────────────
    def verify(self, frame) -> dict:
        if not _DF or not self.enrolled or self._ref_embedding is None:
            return {"verified": True, "distance": 0.0}
        try:
            result = DeepFace.represent(
                img_path         = frame,
                model_name       = config.ID_MODEL,
                detector_backend = config.ID_BACKEND,
                enforce_detection = False,
            )
            if not result:
                self.last_result = {"verified": False, "distance": 1.0, "reason": "no_face"}
                return self.last_result

            emb  = np.array(result[0]["embedding"])
            emb /= (np.linalg.norm(emb) + 1e-6)
            dist = float(1.0 - np.dot(self._ref_embedding, emb))   # cosine distance

            verified = dist < config.ID_THRESHOLD
            self.last_result = {"verified": verified, "distance": round(dist, 4)}
            return self.last_result

        except Exception as e:
            print(f"  [Identity] Verify error: {e}")
            return {"verified": True, "distance": 0.0}
