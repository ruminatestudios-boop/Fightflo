"use client";

import { WORKOUT_CATEGORIES } from "@/lib/workout-categories";
import type { TrainingCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface CategorySelectScreenProps {
  selected: TrainingCategory;
  onSelect: (category: TrainingCategory) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CategorySelectScreen({
  selected,
  onSelect,
  onNext,
  onBack,
}: CategorySelectScreenProps) {
  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader eyebrow="Training" title="What are you training?" />

      <div className="mt-10 flex-1 space-y-2">
        {WORKOUT_CATEGORIES.map((cat, i) => (
          <GlassCard
            key={cat.id}
            index={i}
            selected={selected === cat.id}
            onClick={() => onSelect(cat.id)}
          >
            <p className="font-display text-xl text-white">{cat.label}</p>
            <p className="mt-1 text-sm text-[#737373]">{cat.subtitle}</p>
          </GlassCard>
        ))}
      </div>

      <div className="mt-10 pb-2">
        <Button onClick={onNext}>Continue</Button>
      </div>
    </ScreenWrapper>
  );
}
