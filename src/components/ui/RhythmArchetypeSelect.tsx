"use client";

import { rhythmArchetypesForStyle } from "@/lib/style-discipline";
import { isRhythmArchetypePro } from "@/lib/pro-gates";
import type { FightStyle, RhythmArchetype } from "@/lib/types";
import { ProBadge } from "@/components/ui/ProBadge";

interface RhythmArchetypeSelectProps {
  style: FightStyle;
  value: RhythmArchetype;
  onChange: (archetype: RhythmArchetype) => void;
  isPro: boolean;
  onUpgrade: () => void;
}

export function RhythmArchetypeSelect({
  style,
  value,
  onChange,
  isPro,
  onUpgrade,
}: RhythmArchetypeSelectProps) {
  const archetypes = rhythmArchetypesForStyle(style);

  return (
    <div className="space-y-2">
      {archetypes.map((archetype) => {
        const locked = !isPro && isRhythmArchetypePro(archetype.id);
        const selected = value === archetype.id;

        return (
          <button
            key={archetype.id}
            type="button"
            onClick={() => {
              if (locked) {
                onUpgrade();
                return;
              }
              onChange(archetype.id);
            }}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
              selected
                ? "nike-card-selected"
                : locked
                  ? "nike-card opacity-75"
                  : "nike-card hover:border-white/[0.12]"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-lg text-white">{archetype.label}</p>
                {locked && <ProBadge />}
              </div>
              <p className="mt-1 text-sm text-[#737373]">{archetype.subtitle}</p>
            </div>
            <div
              className={`h-5 w-5 rounded-full border-2 ${
                selected ? "border-[#fa4141] bg-[#fa4141]" : "border-[#404040]"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
