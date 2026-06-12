"use client";

import type { ReactNode } from "react";

export function chipClass(selected: boolean): string {
  return selected
    ? "border-[#fa4141]/50 bg-[#fa4141]/10 text-white"
    : "border-white/[0.08] text-[#737373] hover:border-white/[0.15]";
}

export function BagStatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="nike-card rounded-xl p-4">
      <p className="label text-[#525252]">{label}</p>
      <p
        className={`font-display mt-1 text-2xl ${
          accent ? "text-[#fa4141]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function BagSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="label mb-3 text-[#525252]">{label}</p>
      {children}
    </div>
  );
}

export const CHART_COLORS = {
  line: "#fa4141",
  grid: "rgba(255,255,255,0.15)",
  tooltipBg: "#141414",
  tooltipBorder: "rgba(255,255,255,0.08)",
};
