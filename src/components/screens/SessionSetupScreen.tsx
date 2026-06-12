"use client";

import { useState } from "react";
import {
  SESSION_DURATIONS,
  type SessionDurationId,
  type SessionIntensity,
} from "@/lib/workout-categories";
import { categoryLabel } from "@/lib/workout-categories";
import type { TrainingCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface SessionSetupScreenProps {
  category: TrainingCategory;
  onStart: (intensity: SessionIntensity, durationId: SessionDurationId) => void;
  onBack: () => void;
}

const INTENSITIES: { id: SessionIntensity; label: string; subtitle: string }[] = [
  { id: "easy", label: "Steady", subtitle: "Build rhythm · stay moving" },
  { id: "standard", label: "Standard", subtitle: "Real training pace" },
  { id: "intense", label: "Intense", subtitle: "Maximum pressure" },
];

export function SessionSetupScreen({ category, onStart, onBack }: SessionSetupScreenProps) {
  const [intensity, setIntensity] = useState<SessionIntensity>("standard");
  const [durationId, setDurationId] = useState<SessionDurationId>("standard");

  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader
        eyebrow={categoryLabel(category)}
        title="Duration & intensity"
      />

      <p className="mt-2 text-sm text-[#737373]">Keep it simple — tap and go.</p>

      <div className="mt-8">
        <p className="label mb-3 text-[#525252]">Duration</p>
        <div className="flex gap-2">
          {SESSION_DURATIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDurationId(d.id)}
              className={`flex-1 rounded-xl border px-3 py-3 text-center transition-colors ${
                durationId === d.id
                  ? "border-[#fa4141]/50 bg-[#fa4141]/10 text-white"
                  : "border-white/[0.08] text-[#737373] hover:border-white/[0.15]"
              }`}
            >
              <span className="font-display text-lg">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex-1 space-y-2">
        <p className="label mb-3 text-[#525252]">Intensity</p>
        {INTENSITIES.map((item, i) => (
          <GlassCard
            key={item.id}
            index={i}
            selected={intensity === item.id}
            onClick={() => setIntensity(item.id)}
          >
            <p className="font-display text-lg text-white">{item.label}</p>
            <p className="mt-0.5 text-sm text-[#737373]">{item.subtitle}</p>
          </GlassCard>
        ))}
      </div>

      <div className="mt-10 pb-2">
        <Button onClick={() => onStart(intensity, durationId)}>Start session</Button>
      </div>
    </ScreenWrapper>
  );
}
