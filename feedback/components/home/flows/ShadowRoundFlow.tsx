"use client";

import { useEffect, useState } from "react";
import { FlowAction, FlowPanel, FlowShell } from "../FlowShell";
import { InsightCard } from "@/components/home/InsightCard";
import { getLastShadowRound } from "@/lib/shadow/shadowStorage";
import {
  SHADOW_ROUND_MAX_SECONDS,
  SHADOW_ROUND_MIN_SECONDS,
  SHADOW_ROUND_STEP_SECONDS,
  SHADOW_ROUND_TICK_MARKS,
  clampShadowRoundLength,
  type ShadowRoundLength,
  type ShadowRoundResult,
} from "@/lib/shadow/types";

interface ShadowRoundFlowProps {
  onBack: () => void;
  onStartRound: (seconds: ShadowRoundLength) => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTickLabel(seconds: number): string {
  const m = seconds / 60;
  if (m >= 10 && seconds % 60 === 0) return `${m}m`;
  return formatTimer(seconds);
}

function formatRoundLengthLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return m === 1 ? "1 minute" : `${m} minutes`;
  return `${m} min ${s} sec`;
}

const TRACK_ITEMS = [
  "Jab, cross, hooks — and full combos (1-2, 1-2-3, etc.)",
  "Hands drop after punches — tied to the combo you threw",
  "Slow guard return between combos",
  "Elbow flare on extension",
  "Chin riding up",
  "Flat hips when punching",
] as const;

export function ShadowRoundFlow({
  onBack,
  onStartRound,
}: ShadowRoundFlowProps) {
  const [roundSeconds, setRoundSeconds] = useState<ShadowRoundLength>(120);
  const [lastRound, setLastRound] = useState<ShadowRoundResult | null>(null);

  useEffect(() => {
    setLastRound(getLastShadowRound());
  }, []);

  return (
    <FlowShell
      title="Shadowboxing round"
      subtitle="Live coaching"
      onBack={onBack}
    >
      <InsightCard
        kicker="What we track live"
        title="Real-time movement analysis"
        summary="Shadow a round while AI watches your guard, combos, and mechanics — then gives you a full report."
      />

      <FlowPanel>
        <p className="home-flow-label">Round length</p>
        <div className="shadow-flow-timer">
          <p className="shadow-flow-timer-display" aria-live="polite">
            {formatTimer(roundSeconds)}
          </p>
          <p className="shadow-flow-timer-caption">
            {formatRoundLengthLabel(roundSeconds)}
          </p>
          <input
            type="range"
            className="shadow-flow-timer-slider"
            min={SHADOW_ROUND_MIN_SECONDS}
            max={SHADOW_ROUND_MAX_SECONDS}
            step={SHADOW_ROUND_STEP_SECONDS}
            value={roundSeconds}
            onChange={(e) =>
              setRoundSeconds(clampShadowRoundLength(Number(e.target.value)))
            }
            aria-label="Round length"
            aria-valuemin={SHADOW_ROUND_MIN_SECONDS}
            aria-valuemax={SHADOW_ROUND_MAX_SECONDS}
            aria-valuenow={roundSeconds}
            aria-valuetext={formatRoundLengthLabel(roundSeconds)}
          />
          <div className="shadow-flow-timer-ticks" aria-hidden>
            {SHADOW_ROUND_TICK_MARKS.map((len) => (
              <span
                key={len}
                className={
                  roundSeconds === len ? "shadow-flow-timer-tick--active" : ""
                }
              >
                {formatTickLabel(len)}
              </span>
            ))}
          </div>
        </div>
      </FlowPanel>

      {lastRound ? (
        <InsightCard
          kicker="Last round"
          title={`${lastRound.issueCount ?? lastRound.dropCount} issue${(lastRound.issueCount ?? lastRound.dropCount) === 1 ? "" : "s"} · ${lastRound.positiveCount ?? 0} good moment${(lastRound.positiveCount ?? 0) === 1 ? "" : "s"}`}
          titleVariant="body"
          summary={lastRound.summary}
          highlight={lastRound.recommendMore?.[0]?.label}
          highlightLabel="Do more of"
        />
      ) : null}

      <FlowAction onClick={() => onStartRound(roundSeconds)}>
        Start round
      </FlowAction>
    </FlowShell>
  );
}
