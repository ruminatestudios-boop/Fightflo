import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, WRIST_VELOCITY_PX, WRIST_VELOCITY_WINDOW_MS } from "./constants";
import { lm } from "./landmarks";

interface WristSample {
  x: number;
  y: number;
  t: number;
}

export interface VelocityHit {
  side: "left" | "right";
  pxPerFrame: number;
  at: number;
}

export class WristVelocityTracker {
  private left: WristSample[] = [];
  private right: WristSample[] = [];

  update(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number,
    timestampMs: number
  ): VelocityHit | null {
    const lw = lm(landmarks, LM.LEFT_WRIST);
    const rw = lm(landmarks, LM.RIGHT_WRIST);
    let hit: VelocityHit | null = null;

    if (lw) {
      const sample = { x: lw.x * width, y: lw.y * height, t: timestampMs };
      hit = this.checkSide("left", sample) ?? hit;
      this.left.push(sample);
      this.trim(this.left, timestampMs);
    }
    if (rw) {
      const sample = { x: rw.x * width, y: rw.y * height, t: timestampMs };
      hit = this.checkSide("right", sample) ?? hit;
      this.right.push(sample);
      this.trim(this.right, timestampMs);
    }
    return hit;
  }

  private trim(samples: WristSample[], now: number): void {
    while (samples.length > 0 && now - samples[0].t > WRIST_VELOCITY_WINDOW_MS) {
      samples.shift();
    }
  }

  private checkSide(side: "left" | "right", current: WristSample): VelocityHit | null {
    const samples = side === "left" ? this.left : this.right;
    if (samples.length === 0) return null;
    const prev = samples[samples.length - 1];
    const dt = current.t - prev.t;
    if (dt <= 0 || dt > WRIST_VELOCITY_WINDOW_MS) return null;
    const px = Math.hypot(current.x - prev.x, current.y - prev.y);
    if (px >= WRIST_VELOCITY_PX) {
      return { side, pxPerFrame: px, at: current.t };
    }
    return null;
  }

  reset(): void {
    this.left = [];
    this.right = [];
  }
}
