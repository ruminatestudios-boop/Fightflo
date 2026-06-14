import type { FrameLandmarks, LandmarkPoint, LandmarkTimeline } from "@/types";

/** One Euro filter — reduces jitter while keeping responsiveness */
class OneEuroFilter {
  private freq: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(
    freq: number,
    minCutoff = 1.0,
    beta = 0.007,
    dCutoff = 1.0
  ) {
    this.freq = freq;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number): number {
    const te = 1 / this.freq;
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / te);
  }

  filter(value: number, timestamp: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = timestamp;
      this.xPrev = value;
      return value;
    }

    const dt = Math.max(timestamp - this.tPrev, 1 / this.freq);
    this.freq = 1 / dt;

    const dx = (value - this.xPrev) / dt;
    const edx = this.alpha(this.dCutoff) * dx + (1 - this.alpha(this.dCutoff)) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const result = this.alpha(cutoff) * value + (1 - this.alpha(cutoff)) * this.xPrev;

    this.xPrev = result;
    this.dxPrev = edx;
    this.tPrev = timestamp;
    return result;
  }
}

const JOINT_KEYS: (keyof FrameLandmarks)[] = [
  "nose",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

export function smoothLandmarkTimeline(
  timeline: LandmarkTimeline,
  fps: number
): LandmarkTimeline {
  const filters = new Map<string, { fx: OneEuroFilter; fy: OneEuroFilter }>();

  for (const joint of JOINT_KEYS) {
    filters.set(joint, {
      fx: new OneEuroFilter(fps, 0.8, 0.02),
      fy: new OneEuroFilter(fps, 0.8, 0.02),
    });
  }

  return timeline.map((frame, i) => {
    const t = i / fps;
    const landmarks: FrameLandmarks = { ...frame.landmarks };

    for (const joint of JOINT_KEYS) {
      const point = frame.landmarks[joint];
      if (!point || (point.visibility ?? 0) < 0.35) continue;

      const f = filters.get(joint)!;
      landmarks[joint] = {
        ...point,
        x: f.fx.filter(point.x, t),
        y: f.fy.filter(point.y, t),
      };
    }

    return { ...frame, landmarks };
  });
}

export function interpolateLandmarks(
  a: FrameLandmarks,
  b: FrameLandmarks,
  t: number
): FrameLandmarks {
  const result: FrameLandmarks = {};
  for (const joint of JOINT_KEYS) {
    const pa = a[joint];
    const pb = b[joint];
    if (!pa && !pb) continue;
    if (!pa) {
      result[joint] = pb;
      continue;
    }
    if (!pb) {
      result[joint] = pa;
      continue;
    }
    if ((pa.visibility ?? 0) < 0.2 && (pb.visibility ?? 0) < 0.2) continue;

    result[joint] = {
      x: pa.x + (pb.x - pa.x) * t,
      y: pa.y + (pb.y - pa.y) * t,
      z: (pa.z ?? 0) + ((pb.z ?? 0) - (pa.z ?? 0)) * t,
      visibility: Math.max(pa.visibility ?? 0, pb.visibility ?? 0),
    };
  }
  return result;
}

export function lerpPoint(a: LandmarkPoint, b: LandmarkPoint, t: number): LandmarkPoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
    visibility: Math.max(a.visibility ?? 0, b.visibility ?? 0),
  };
}
