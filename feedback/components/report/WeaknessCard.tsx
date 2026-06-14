"use client";

import type { MainWeakness } from "@/types";

interface WeaknessCardProps {
  weakness: MainWeakness;
  clipUrl?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export function WeaknessCard({
  weakness,
  clipUrl,
  isPro = false,
  onUpgrade,
}: WeaknessCardProps) {
  const fields = [
    { label: "What is happening", value: weakness.what_is_happening },
    { label: "Root cause", value: weakness.root_cause },
    { label: "Fight consequence", value: weakness.fight_consequence },
    { label: "Mechanical fix", value: weakness.mechanical_fix },
  ];

  return (
    <div className="gradient-card bg-gradient-to-b from-[#3d2814] via-[#1a1008] to-[#0a0806] p-5 ring-1 ring-[#ff9500]/30">
      <button
        type="button"
        onClick={() => {
          if (!isPro && onUpgrade) {
            onUpgrade();
            return;
          }
          if (clipUrl) window.open(clipUrl, "_blank");
        }}
        className="font-mono text-[11px] text-[#ff9500]"
      >
        {weakness.timestamp}
        {!isPro && " · Pro for clip"}
      </button>
      <h3 className="mt-2 text-base font-medium capitalize text-white">
        {weakness.title}
      </h3>
      <dl className="mt-4 space-y-3">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-[11px] text-white/35">{field.label}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-white/60">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
