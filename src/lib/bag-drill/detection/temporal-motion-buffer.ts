import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { TEMPORAL_WINDOW_MS } from "./constants";

export interface MotionFrame {
  at: number;
  landmarks: NormalizedLandmark[];
  hands: NormalizedLandmark[][] | null;
  width: number;
  height: number;
}

export class TemporalMotionBuffer {
  private frames: MotionFrame[] = [];

  push(frame: MotionFrame): void {
    this.frames.push(frame);
    const cutoff = frame.at - TEMPORAL_WINDOW_MS;
    this.frames = this.frames.filter((f) => f.at >= cutoff);
    if (this.frames.length > 24) {
      this.frames = this.frames.slice(-24);
    }
  }

  getRecent(windowMs = TEMPORAL_WINDOW_MS): MotionFrame[] {
    if (this.frames.length === 0) return [];
    const latest = this.frames[this.frames.length - 1].at;
    const cutoff = latest - windowMs;
    return this.frames.filter((f) => f.at >= cutoff);
  }

  clear(): void {
    this.frames = [];
  }
}
