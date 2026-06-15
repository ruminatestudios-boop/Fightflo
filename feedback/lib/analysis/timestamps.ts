/** Shared timestamp helpers — safe for client and server (no Node/ffmpeg). */

export const FRAMES_PER_SECOND = 12;

export function parseTimestamp(ts: string): number {
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
