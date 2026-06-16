"use client";

interface SegmentedProgressBarProps {
  progress: number;
  segments?: number;
  className?: string;
}

export function SegmentedProgressBar({
  progress,
  segments = 40,
  className = "",
}: SegmentedProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  const filledCount = Math.round((clamped / 100) * segments);

  return (
    <div
      className={`segmented-progress ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: segments }, (_, index) => {
        const filled = index < filledCount;
        const leading = filled && index === filledCount - 1;

        return (
          <span
            key={index}
            className={`segmented-progress-segment ${
              filled ? "segmented-progress-segment--filled" : ""
            } ${leading ? "segmented-progress-segment--leading" : ""}`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
