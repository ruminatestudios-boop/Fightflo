/** Fighter stance — drives jab/cross mapping in AI prompts. */
export type BagStance = "orthodox" | "southpaw";

export interface GuardBaselineCal {
  left: number;
  right: number;
  chinY: number;
}

export interface BagCalibration {
  stance: BagStance;
  /** Passive + active mic calibration (0–1 peak threshold). */
  micThreshold: number;
  lightingOk: boolean;
  /** Average frame luminance 0–1 from pre-flight sample. */
  brightness: number;
  testPunchesDetected: number;
  frameConfirmed: boolean;
  /** Wrist height baseline from guard calibration step */
  guardBaseline?: GuardBaselineCal;
  poseReady?: boolean;
  gpuDelegate?: boolean;
}

export const DEFAULT_CALIBRATION: BagCalibration = {
  stance: "orthodox",
  micThreshold: 0.22,
  lightingOk: true,
  brightness: 0.35,
  testPunchesDetected: 0,
  frameConfirmed: false,
};

/** Sample average luminance from a video frame (0 = black, 1 = white). */
export async function sampleFrameBrightness(
  video: HTMLVideoElement
): Promise<number> {
  if (!video.videoWidth) return 0;
  const canvas = document.createElement("canvas");
  const w = Math.min(160, video.videoWidth);
  const h = Math.round((w / video.videoWidth) * video.videoHeight);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.drawImage(video, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  const pixels = w * h;
  for (let i = 0; i < data.length; i += 4) {
    sum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }
  return sum / pixels;
}

export function brightnessOk(score: number): boolean {
  return score >= 0.1 && score <= 0.88;
}

/** Derive impact threshold from calibration punch peaks. */
export function micThresholdFromPeaks(peaks: number[], fallback = 0.22): number {
  if (peaks.length === 0) return fallback;
  const sorted = [...peaks].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? fallback;
  return Math.max(0.12, Math.min(0.5, median * 0.72));
}

export function stanceLabel(stance: BagStance): string {
  return stance === "southpaw" ? "Southpaw" : "Orthodox";
}
