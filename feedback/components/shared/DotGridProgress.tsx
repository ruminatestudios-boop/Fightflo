"use client";

interface DotGridProgressProps {
  progress: number;
  message?: string;
  cols?: number;
  rows?: number;
}

export function DotGridProgress({
  progress,
  message,
  cols = 22,
  rows = 7,
}: DotGridProgressProps) {
  const total = cols * rows;
  const clamped = Math.min(100, Math.max(0, progress));
  const playheadCol = Math.floor((clamped / 100) * cols);

  return (
    <div className="w-full">
      {message && (
        <div
          key={message}
          className="analysis-status-message mb-5 flex items-center gap-2.5 text-sm text-white/75"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <span className="analysis-status-pulse h-2 w-2 rounded-full bg-white/80" />
          </span>
          <span>{message}</span>
        </div>
      )}

      <div className="relative px-0.5">
        <div
          className="grid gap-[5px]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: total }).map((_, i) => {
            const col = i % cols;
            const active = col < playheadCol;
            return (
              <span
                key={i}
                className={`block aspect-square rounded-full transition-colors duration-300 ${
                  active ? "bg-white/85" : "bg-white/[0.12]"
                }`}
              />
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-[2px] bg-[#ff9500]"
          style={{
            left: `calc(${(playheadCol / cols) * 100}% + 2px)`,
            boxShadow: "0 0 8px rgba(255, 149, 0, 0.5)",
          }}
        />
      </div>
    </div>
  );
}
