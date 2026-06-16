"use client";

const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface DownloadProgressRingProps {
  /** 0–100 complete */
  percent: number;
  className?: string;
}

/** Red circular progress — fills clockwise as export completes. */
export function DownloadProgressRing({
  percent,
  className = "",
}: DownloadProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = RING_CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <svg
      className={`download-progress-ring ${className}`.trim()}
      viewBox="0 0 36 36"
      aria-hidden
    >
      <circle
        className="download-progress-ring-track"
        cx="18"
        cy="18"
        r={RING_RADIUS}
        fill="none"
      />
      <circle
        className="download-progress-ring-fill"
        cx="18"
        cy="18"
        r={RING_RADIUS}
        fill="none"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

export function formatDownloadTimeLeft(seconds: number): string {
  if (seconds <= 5) return "a few seconds";
  if (seconds < 60) return `~${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `~${m}m ${s}s` : `~${m}m`;
}
