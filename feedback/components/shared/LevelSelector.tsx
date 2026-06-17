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
            className={`home-level-pill text-left ${
              selected ? "home-level-pill--selected" : ""
            }`}
          >
            <span className="text-xs font-semibold">{level.label}</span>
          </button>
        );
      })}
    </div>
  );
}
