"use client";

import { useEffect, useState } from "react";
import { FlowAction, FlowPanel, FlowShell } from "../FlowShell";
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
      subtitle="Live shadowboxing coach"
      onBack={onBack}
    >
      <FlowPanel>
        <p className="home-flow-lead">
          A live shadowboxing coach — not clip replay. We detect your combos,
          flag exact moments with timestamps, and tell you what to throw more of
          next round.
        </p>

        <div className="shadow-flow-tips">
          <p className="shadow-flow-tips-label">What we track (live)</p>
          <ul className="shadow-flow-tips-list">
            {TRACK_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="shadow-flow-length">
          <p className="shadow-flow-length-label">Round length</p>
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
        </div>

        {lastRound ? (
          <div className="shadow-flow-last">
            <p className="shadow-flow-last-label">Last round</p>
            <p className="shadow-flow-last-stat">
              <strong>{lastRound.issueCount ?? lastRound.dropCount}</strong>{" "}
              {lastRound.issueCount === 1 ? "issue" : "issues"} ·{" "}
              <strong>{lastRound.positiveCount ?? 0}</strong> good moment
              {(lastRound.positiveCount ?? 0) === 1 ? "" : "s"}
            </p>
            <p className="shadow-flow-last-hint">{lastRound.summary}</p>
            {lastRound.recommendMore?.[0] ? (
              <p className="shadow-flow-last-combo">
                Do more: <strong>{lastRound.recommendMore[0].label}</strong>
              </p>
            ) : null}
          </div>
        ) : null}
      </FlowPanel>

      <FlowAction onClick={() => onStartRound(roundSeconds)}>
        Start shadowboxing round
      </FlowAction>
    </FlowShell>
  );
}
