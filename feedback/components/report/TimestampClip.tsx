"use client";

interface TimestampClipProps {
  timestamp: string;
  clipUrl?: string;
  description: string;
  accentColor?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export function TimestampClip({
  timestamp,
  clipUrl,
  description,
  accentColor = "#FF0000",
  isPro = false,
  onUpgrade,
}: TimestampClipProps) {
  const handlePlay = () => {
    if (!isPro) {
      onUpgrade?.();
      return;
    }
    if (clipUrl) window.open(clipUrl, "_blank");
  };

  return (
    <button
      type="button"
      onClick={handlePlay}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs"
        style={{ background: `${accentColor}22`, color: accentColor }}
      >
        {timestamp}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{description}</p>
        <p className="text-[10px] text-white/35">
          {isPro ? "Tap to play clip" : "Pro required for clip playback"}
        </p>
      </div>
      <svg
        className="h-5 w-5 shrink-0 text-white/40"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
  );
}
