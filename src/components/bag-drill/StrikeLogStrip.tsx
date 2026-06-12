"use client";

import type { StrikeLogEntry } from "@/lib/bag-drill/types";

function statusSymbol(status: StrikeLogEntry["status"]): string {
  if (status === "hit" || status === "disputed") return "✓";
  if (status === "wrong") return "✗";
  if (status === "miss") return "—";
  return "·";
}

function statusColor(status: StrikeLogEntry["status"]): string {
  if (status === "hit") return "text-emerald-400";
  if (status === "disputed") return "text-amber-400";
  if (status === "wrong" || status === "miss") return "text-[#fa4141]";
  return "text-white/25";
}

interface StrikeLogStripProps {
  entries: StrikeLogEntry[];
}

export function StrikeLogStrip({ entries }: StrikeLogStripProps) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2">
      {entries.map((e, i) => (
        <span
          key={`${e.strikeId}-${i}`}
          className={`text-xs uppercase tracking-[0.1em] ${statusColor(e.status)}`}
        >
          {e.label}{" "}
          <span className="font-medium">{statusSymbol(e.status)}</span>
          {e.micBackup && (
            <span className="ml-0.5 text-[9px] text-white/30">mic</span>
          )}
        </span>
      ))}
    </div>
  );
}
