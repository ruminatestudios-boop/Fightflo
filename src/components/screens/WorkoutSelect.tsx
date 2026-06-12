"use client";

import { WORKOUT_MODES } from "@/lib/constants";
import type { WorkoutMode } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface WorkoutSelectProps {
  selected: WorkoutMode;
  onSelect: (mode: WorkoutMode) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WorkoutSelect({ selected, onSelect, onNext, onBack }: WorkoutSelectProps) {
  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader eyebrow="Workout type" title="How you train" />

      <div className="mt-10 flex-1 space-y-2">
        {WORKOUT_MODES.map((mode, i) => (
          <GlassCard
            key={mode.id}
            index={i}
            selected={selected === mode.id}
            onClick={() => onSelect(mode.id)}
          >
            <p className="font-display text-xl text-white">{mode.label}</p>
            <p className="mt-1 text-sm text-[#737373]">{mode.subtitle}</p>
          </GlassCard>
        ))}
      </div>

      <div className="mt-10 pb-2">
        <Button onClick={onNext}>Continue</Button>
      </div>
    </ScreenWrapper>
  );
}
