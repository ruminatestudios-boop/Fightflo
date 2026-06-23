/**
 * Locks live pose tracking onto one person instead of whichever face
 * MediaPipe happens to detect first each frame. With multiple people in
 * frame, per-frame detection has no identity memory — it can flip between
 * people frame to frame, making the skeleton "dart" around.
 *
 * Strategy: scan for a short calibration window, locking onto whoever is
 * most prominent (largest bounding box = closest to camera). After that,
 * stick with whoever is closest to the last known position each frame —
 * only re-locking if the tracked person is lost for a while.
 */

export type RawPose = Array<{ x: number; y: number; z: number; visibility?: number }>;

const CALIBRATION_MS = 2500;
const MAX_JUMP_DISTANCE = 0.22; // normalized 0-1 frame coordinates
const LOST_RESET_MS = 1500;

// BlazePose indices: shoulders 11/12, hips 23/24
const TORSO_INDICES = [11, 12, 23, 24];

function torsoCentroid(pose: RawPose): { x: number; y: number } | null {
  const points = TORSO_INDICES.map((i) => pose[i]).filter(
    (p): p is RawPose[number] => Boolean(p) && (p.visibility ?? 1) > 0.3
  );
  if (points.length === 0) return null;
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return { x, y };
}

function boundingBoxArea(pose: RawPose): number {
  const visible = pose.filter((p) => (p.visibility ?? 1) > 0.3);
  if (visible.length === 0) return 0;
  const xs = visible.map((p) => p.x);
  const ys = visible.map((p) => p.y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class PersonLockTracker {
  private startedAt = performance.now();
  private lockedCentroid: { x: number; y: number } | null = null;
  private lastSeenAt = performance.now();

  /** Restart calibration — call when starting a new live session */
  reset(): void {
    this.startedAt = performance.now();
    this.lockedCentroid = null;
    this.lastSeenAt = performance.now();
  }

  /** Pick the candidate pose belonging to the locked-on fighter, if any */
  select(poses: RawPose[]): RawPose | null {
    if (poses.length === 0) return null;
    if (poses.length === 1) {
      const centroid = torsoCentroid(poses[0]);
      if (centroid) {
        this.lockedCentroid = centroid;
        this.lastSeenAt = performance.now();
      }
      return poses[0];
    }

    const now = performance.now();
    const calibrating = now - this.startedAt < CALIBRATION_MS;
    const lostTooLong = now - this.lastSeenAt > LOST_RESET_MS;

    if (calibrating || !this.lockedCentroid || lostTooLong) {
      // Lock onto whoever is most prominent (largest/closest to camera)
      let best: RawPose | null = null;
      let bestArea = -1;
      for (const pose of poses) {
        const area = boundingBoxArea(pose);
        if (area > bestArea) {
          bestArea = area;
          best = pose;
        }
      }
      if (best) {
        const centroid = torsoCentroid(best);
        if (centroid) {
          this.lockedCentroid = centroid;
          this.lastSeenAt = now;
        }
      }
      return best;
    }

    // Locked — stick with whoever is closest to the last known position
    let closest: RawPose | null = null;
    let closestDist = Infinity;
    for (const pose of poses) {
      const centroid = torsoCentroid(pose);
      if (!centroid) continue;
      const d = distance(centroid, this.lockedCentroid);
      if (d < closestDist) {
        closestDist = d;
        closest = pose;
      }
    }

    if (closest && closestDist <= MAX_JUMP_DISTANCE) {
      const centroid = torsoCentroid(closest);
      if (centroid) this.lockedCentroid = centroid;
      this.lastSeenAt = now;
      return closest;
    }

    // Tracked person not found this frame within a sane distance — hold
    // position rather than snapping to someone else.
    return null;
  }
}
