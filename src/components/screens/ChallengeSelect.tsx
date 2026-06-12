"use client";

import { CHALLENGES } from "@/lib/constants";
import { isChallengePro } from "@/lib/pro-gates";
import type { ChallengePreset } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProBadge } from "@/components/ui/ProBadge";
import { ProUpsell } from "@/components/ui/ProUpsell";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface ChallengeSelectProps {
  onSelect: (challenge: ChallengePreset) => void;
  onBack: () => void;
  isPro: boolean;
  onUpgrade: () => void;
}

export function ChallengeSelect({
  onSelect,
  onBack,
  isPro,
  onUpgrade,
}: ChallengeSelectProps) {
  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader
        eyebrow="Can you survive?"
        title="Challenges"
      />

      <div className="mt-10 flex-1 space-y-2 overflow-y-auto pb-4">
        {CHALLENGES.map((challenge, i) => {
          const locked = !isPro && isChallengePro(challenge);
          return (
            <GlassCard
              key={challenge.id}
              index={i}
              onClick={() => {
                if (locked) {
                  onUpgrade();
                  return;
                }
                onSelect(challenge);
              }}
              className={`${challenge.featured ? "!border-[#fa4141]/40" : ""} ${locked ? "opacity-80" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-xl text-white">
                      {challenge.name}
                    </p>
                    {locked && <ProBadge />}
                  </div>
                  <p className="mt-1 text-sm text-[#fa4141]">
                    {challenge.tagline}
                  </p>
                  <p className="mt-2 text-xs text-[#525252]">
                    {challenge.rounds.rounds} rounds ·{" "}
                    {Math.floor(challenge.rounds.roundLength / 60)}min ·{" "}
                    {challenge.mode}
                  </p>
                </div>
                {challenge.featured && !locked && (
                  <span className="shrink-0 rounded-full border border-[#fa4141]/30 bg-[#fa4141]/10 px-2.5 py-1 text-[10px] font-semibold text-[#fa4141]">
                    Featured
                  </span>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {!isPro && (
        <div className="mt-4">
          <ProUpsell onUpgrade={onUpgrade} compact />
        </div>
      )}

      <p className="mt-6 pb-2 text-center text-xs text-[#525252]">
        Share your survival score
      </p>
    </ScreenWrapper>
  );
}
