"use client";

import { motion } from "framer-motion";
import type { SessionStats } from "@/lib/types";
import { buildSummaryMessage } from "@/lib/scoring";
import { formatDuration } from "@/lib/history";
import type { SessionNextStep } from "@/lib/session-recommendations";
import { SHOW_ADVANCED } from "@/lib/feature-flags";
import { Button } from "@/components/ui/Button";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface SummaryScreenProps {
  stats: SessionStats;
  isPersonalBest?: boolean;
  durationSeconds?: number;
  nextStep: SessionNextStep;
  onAgain: () => void;
  onHome: () => void;
  onRecords: () => void;
  onNextStep: () => void;
}

export function SummaryScreen({
  stats,
  isPersonalBest = false,
  durationSeconds,
  nextStep,
  onAgain,
  onHome,
  onRecords,
  onNextStep,
}: SummaryScreenProps) {
  const message = buildSummaryMessage(
    stats.mode,
    stats.challengeName,
    stats.survived,
    stats.trainingCategory
  );

  const outputLabel =
    stats.pressureRating === "EXTREME" || stats.pressureRating === "HIGH"
      ? "HIGH"
      : stats.pressureRating === "MEDIUM"
        ? "SOLID"
        : "STEADY";

  const handleShare = async () => {
    const text = `fightflo — ${message}\nReaction Score: ${stats.reactionScore}\nTotal Output: ${outputLabel}\n#fightflo`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "fightflo", text });
        return;
      } catch {
        /* cancelled */
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch {
      /* ignore */
    }
  };

  const nextLabel =
    nextStep.action === "opponent"
      ? "Train vs a fighter"
      : nextStep.action === "pro"
        ? "See Pro"
        : nextStep.action === "harder"
          ? "Step up session"
          : "Train again";

  return (
    <ScreenWrapper className="justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(250,65,65,0.15),transparent_55%)]" />

        <div className="relative border-b border-white/[0.06] px-6 py-6">
          {isPersonalBest && (
            <p className="label mb-2 text-[#fa4141]">New personal best</p>
          )}
          <p className="label text-[#525252]">Session complete</p>
          <h2 className="mt-2 font-display text-2xl leading-tight tracking-wide text-white">
            {message}
          </h2>
          {stats.sprintFinisherUsed && (
            <p className="mt-2 text-xs uppercase tracking-wider text-[#fa4141]">
              Sprint finisher activated
            </p>
          )}
        </div>

        <div className="relative grid grid-cols-2 gap-px bg-white/[0.06] p-px">
          {[
            { label: "Reaction", value: stats.reactionScore, accent: true },
            { label: "Output", value: outputLabel, accent: false },
            {
              label: stats.workoutMode === "combos" ? "Combos" : "Signals",
              value: stats.totalSignals,
              accent: false,
            },
            {
              label: "Rounds",
              value: `${stats.roundsCompleted}/${stats.totalRounds}`,
              accent: false,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0a0a0a] px-5 py-4">
              <p className="label text-[#525252]">{stat.label}</p>
              <p
                className={`mt-1 font-display text-3xl leading-none ${
                  stat.accent ? "text-[#fa4141]" : "text-white"
                }`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {SHOW_ADVANCED && (
          <div className="relative border-t border-white/[0.06] px-6 py-4">
            <p className="text-sm font-medium text-white">{nextStep.title}</p>
            <p className="mt-1 text-sm leading-snug text-[#737373]">{nextStep.detail}</p>
            {durationSeconds ? (
              <p className="mt-3 text-xs text-[#525252]">
                Saved · {formatDuration(durationSeconds)}
              </p>
            ) : (
              <p className="mt-3 text-xs text-[#525252]">Saved to records</p>
            )}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
        className="mt-6 space-y-2.5 pb-2"
      >
        {SHOW_ADVANCED ? (
          <>
            <Button onClick={onNextStep}>{nextLabel}</Button>
            <Button variant="outline" size="md" onClick={onAgain}>
              Same session again
            </Button>
            <Button variant="outline" size="md" onClick={handleShare}>
              Share result
            </Button>
            <Button variant="ghost" size="sm" onClick={onHome}>
              Home
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onAgain}>Train again</Button>
            <Button variant="outline" size="md" onClick={onHome}>
              Home
            </Button>
          </>
        )}
      </motion.div>
    </ScreenWrapper>
  );
}
