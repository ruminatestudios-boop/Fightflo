"use client";

import type { PositiveFinding } from "@/types";

interface PositiveCardProps {
  positive: PositiveFinding;
  clipUrl?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export function PositiveCard({
  positive,
  clipUrl,
  isPro = false,
  onUpgrade,
}: PositiveCardProps) {
  return (
    <div className="surface-card p-4">
      <button
        type="button"
        onClick={() => {
          if (!isPro && onUpgrade) {
            onUpgrade();
            return;
          }
          if (clipUrl) window.open(clipUrl, "_blank");
        }}
        className="font-mono text-[11px] text-[#ff9500]/90"
      >
        {positive.timestamp}
        {!isPro && " · Pro for clip"}
      </button>
      <h3 className="mt-2 text-sm font-medium text-white">{positive.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/45">
        {positive.technical_detail}
      </p>
    </div>
  );
}
