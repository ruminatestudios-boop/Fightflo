"use client";

import { SELECTABLE_SPORTS, SPORTS } from "@/config/sports";
import type { SportId } from "@/types";

interface SportSelectorProps {
  value: SportId;
  onChange: (sport: SportId) => void;
}

export function SportSelector({ value, onChange }: SportSelectorProps) {
  return (
    <div className="flex gap-2">
      {SELECTABLE_SPORTS.map((id) => {
        const sport = SPORTS[id];
        const selected = value === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex flex-1 items-center gap-2 rounded-card border-2 bg-white px-3 py-2.5 text-left text-black shadow-sm transition-all active:scale-[0.98] ${
              selected
                ? "border-black shadow-md"
                : "border-transparent hover:shadow-md"
            }`}
          >
            <span className="text-base">{sport.emoji}</span>
            <span className="font-display text-xs font-semibold uppercase tracking-wide text-neutral-900">
              {sport.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
