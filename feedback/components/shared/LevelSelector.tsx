"use client";

import type { SkillLevel } from "@/types";

const LEVELS: { id: SkillLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "pro", label: "Pro" },
];

interface LevelSelectorProps {
  value: SkillLevel;
  onChange: (level: SkillLevel) => void;
}

export function LevelSelector({ value, onChange }: LevelSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {LEVELS.map((level) => {
        const selected = value === level.id;
        return (
          <button
            key={level.id}
            type="button"
            onClick={() => onChange(level.id)}
            className={`rounded-card border-2 bg-white px-3 py-2.5 text-left text-black shadow-sm transition-all active:scale-[0.98] ${
              selected
                ? "border-black shadow-md"
                : "border-transparent hover:shadow-md"
            }`}
          >
            <span className="font-display text-xs font-semibold text-neutral-900">
              {level.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
