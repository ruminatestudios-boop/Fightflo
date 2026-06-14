"use client";

interface ProgressBarProps {
  progress: number;
  message: string;
}

export function ProgressBar({ progress, message }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      <p className="text-sm text-white/60">{message}</p>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs text-white/30">{Math.round(clamped)}%</p>
    </div>
  );
}
