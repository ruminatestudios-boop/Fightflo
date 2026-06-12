"use client";

import { DIFFICULTY_MODES } from "@/lib/constants";
import { isModePro } from "@/lib/pro-gates";
import type { DifficultyMode } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProBadge } from "@/components/ui/ProBadge";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface ModeSelectProps {
  selected: DifficultyMode;
  onSelect: (mode: DifficultyMode) => void;
  onNext: () => void;
  onBack: () => void;
  isPro: boolean;
  onUpgrade: () => void;
}

export function ModeSelect({
  selected,
  onSelect,
  onNext,
  onBack,
  isPro,
  onUpgrade,
}: ModeSelectProps) {
  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader eyebrow="Select mode" title="Intensity" />

      <div className="mt-10 flex-1 space-y-2">
        {DIFFICULTY_MODES.map((mode, i) => {
          const locked = !isPro && isModePro(mode.id);
          return (
            <GlassCard
              key={mode.id}
              index={i}
              selected={selected === mode.id}
              onClick={() => {
                if (locked) {
                  onUpgrade();
                  return;
                }
                onSelect(mode.id);
              }}
              className={locked ? "opacity-80" : ""}
            >
              <div className="flex items-center gap-2">
                <p className="font-display text-xl text-white">{mode.label}</p>
                {locked && <ProBadge />}
              </div>
              <p className="mt-1 text-sm text-[#737373]">{mode.subtitle}</p>
              {mode.id === "stadium" && (
                <p className="mt-2 text-xs font-medium text-[#fa4141]">
                  Can you survive?
                </p>
              )}
            </GlassCard>
          );
        })}
      </div>

      <div className="mt-10 pb-2">
        <Button onClick={onNext}>Continue</Button>
      </div>
    </ScreenWrapper>
  );
}
