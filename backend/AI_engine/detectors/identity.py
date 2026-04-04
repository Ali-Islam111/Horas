# ==============================================================
# detectors/identity.py  —  ArcFace Identity Verification
# ==============================================================
#
# V10.0: Guided multi-angle enrollment
#   Previously: grabbed N frames all from the same frontal pose.
#   Problem: if student tilts head slightly during exam → distance
#   spikes → false mismatch.
#
#   Now: enrollment captures THREE angle buckets:
#     - Frontal  (yaw ~0°)
#     - Slight left  (yaw -15° to -35°)
#     - Slight right (yaw +15° to +35°)
#   ID_REF_FRAMES frames collected per bucket.
#   Verification compares against ALL stored embeddings and takes
#   the MINIMUM distance (best match) — not just frontal.
#   This makes verification robust to natural head movement.
#
#   Enrollment UX: the session's _push_frame shows a prompt guiding
#   the student through each angle. The caller (_do_enrollment in
#   proctoring_session.py) handles the UI prompts and passes frames
#   tagged with the requested angle.
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
        # Three angle buckets: frontal, left, right
        self._embeddings: list[np.ndarray] = []

    # ── Enrollment ───────────────────────────────────────────
    def enroll(self, frames: list) -> bool:
        """
        frames: flat list of frames from all angles combined.
        Computes one embedding per frame, stores all of them.
        Verification will use the best-match (min distance) across all.
        """
        if not _DF or not frames:
            return False

        embeddings = []
        for frame in frames:
            try:
                result = DeepFace.represent(
                    img_path          = frame,
                    model_name        = config.ID_MODEL,
                    detector_backend  = config.ID_BACKEND,
                    enforce_detection = False,
                )
                if result:
                    emb = np.array(result[0]["embedding"], dtype=np.float32)
                    emb /= (np.linalg.norm(emb) + 1e-6)
                    embeddings.append(emb)
            except Exception as e:
                print(f"  [Identity] Enrollment frame error: {e}")

        if not embeddings:
            print("  [Identity] No face found during enrollment.")
            return False

        self._embeddings = embeddings

        # Save middle frame as reference image for PDF report
        ref_path = os.path.join(config.REF_DIR, f"{self.session_id}_ref.jpg")
        cv2.imwrite(ref_path, frames[len(frames) // 2])
        self.reference_image = ref_path
        self.enrolled        = True
        print(f"  [Identity] Enrolled {len(embeddings)} embeddings "
              f"across {len(frames)} frames → {ref_path}")
        return True

    # ── Verification ─────────────────────────────────────────
    def verify(self, frame) -> dict:
        """
        Returns the MINIMUM cosine distance across all stored embeddings.
        Using min distance = best angle match = most fair comparison.
        """
        if not _DF or not self.enrolled or not self._embeddings:
            return {"verified": True, "distance": 0.0}
        try:
            result = DeepFace.represent(
                img_path          = frame,
                model_name        = config.ID_MODEL,
                detector_backend  = config.ID_BACKEND,
                enforce_detection = False,
            )
            if not result:
                self.last_result = {"verified": False, "distance": 1.0, "reason": "no_face"}
                return self.last_result

            emb = np.array(result[0]["embedding"], dtype=np.float32)
            emb /= (np.linalg.norm(emb) + 1e-6)

            # Best match across all enrolled embeddings
            distances = [float(1.0 - np.dot(ref, emb)) for ref in self._embeddings]
            best_dist = min(distances)

            verified         = best_dist < config.ID_THRESHOLD
            self.last_result = {"verified": verified, "distance": round(best_dist, 4)}
            return self.last_result

        except Exception as e:
            print(f"  [Identity] Verify error: {e}")
            return {"verified": True, "distance": 0.0}
