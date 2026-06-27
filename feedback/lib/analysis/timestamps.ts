/** Shared timestamp helpers — safe for client and server (no Node/ffmpeg). */

// Bumped from 12 — the report-screen skeleton overlay interpolates between
// sampled frames during playback, and 12fps left a visible lag/smear during
// fast motion since real video runs 24-60fps. Raised conservatively (not
// straight to 24) since more frames means more pose-detection compute time
// per scan, moving closer to Vercel's serverless execution limit — the same
// category of issue that caused the "stuck at 3%" bug earlier. Check
// /admin/scan-costs after a real test upload before raising further.
export const FRAMES_PER_SECOND = 18;

export function parseTimestamp(ts: string | null | undefined): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function frameToTimestamp(frameIndex: number): string {
  const totalSeconds = Math.floor(frameIndex / FRAMES_PER_SECOND);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
