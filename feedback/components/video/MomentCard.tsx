"use client";

import type { TimelineMoment } from "./types";

interface MomentCardProps {
  moment: TimelineMoment;
  active?: boolean;
  onSelect?: (timeSeconds: number) => void;
}

export function MomentCard({ moment, active = false, onSelect }: MomentCardProps) {
  const isPositive = moment.kind === "positive";
  const accent = isPositive ? "#22c55e" : "#fa4141";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(moment.timeSeconds)}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-white/20 bg-white/[0.08]"
          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <span
        className="font-mono text-xs shrink-0"
        style={{ color: accent }}
      >
        {moment.timestamp}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
        {moment.title.toUpperCase()}
        {!isPositive && " ⚠"}
      </span>
      <svg
        className="h-4 w-4 shrink-0 text-white/30"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
  );
}

interface MomentCardListProps {
  moments: TimelineMoment[];
  activeTime?: number;
  onSelect?: (timeSeconds: number) => void;
}

export function MomentCardList({
  moments,
  activeTime,
  onSelect,
}: MomentCardListProps) {
  const sorted = [...moments].sort((a, b) => a.timeSeconds - b.timeSeconds);

  return (
    <div className="space-y-2">
      {sorted.map((moment) => (
        <MomentCard
          key={moment.id}
          moment={moment}
          active={
            activeTime !== undefined &&
            Math.abs(activeTime - moment.timeSeconds) < 1
          }
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
