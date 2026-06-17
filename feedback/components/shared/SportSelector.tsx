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
            className={`home-level-pill flex flex-1 items-center gap-2 text-left ${
              selected ? "home-level-pill--selected" : ""
            }`}
          >
            <span className="text-base">{sport.emoji}</span>
            <span className="text-xs font-semibold">{sport.name}</span>
          </button>
        );
      })}
    </div>
  );
}
