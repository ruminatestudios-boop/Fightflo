"use client";

import { useEffect, useState } from "react";
import { FlowAction, FlowPanel, FlowShell } from "../FlowShell";
import { getLastShadowRound } from "@/lib/shadow/shadowStorage";
import {
  SHADOW_ROUND_LENGTHS,
  type ShadowRoundLength,
  type ShadowRoundResult,
} from "@/lib/shadow/types";

interface ShadowRoundFlowProps {
  onBack: () => void;
  onStartRound: (seconds: ShadowRoundLength) => void;
}

function formatRoundLength(seconds: ShadowRoundLength): string {
  if (seconds < 60) return `${seconds}s`;
  const m = seconds / 60;
  return m === 1 ? "1 min" : `${m} min`;
}

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
    <FlowShell title="Shadow round" subtitle="Live shadowboxing coach" onBack={onBack}>
      <FlowPanel>
        <p className="home-flow-lead">
          A live shadowboxing coach — not clip replay. We flag exact
          moments as they happen: where your hands drop, elbows flare, chin rides
          up, hips stay flat — plus what you did well.
        </p>

        <div className="shadow-flow-tips">
          <p className="shadow-flow-tips-label">What we flag (live)</p>
          <ul className="shadow-flow-tips-list">
            <li>Hands drop after punches</li>
            <li>Slow guard return between combos</li>
            <li>Elbow flare on extension</li>
            <li>Chin riding up</li>
            <li>Flat hips when punching</li>
            <li>Stance drifting off centre</li>
          </ul>
        </div>

        <div className="shadow-flow-length">
          <p className="shadow-flow-length-label">Round length</p>
          <div className="shadow-flow-length-options" role="radiogroup" aria-label="Round length">
            {SHADOW_ROUND_LENGTHS.map((len) => (
              <button
                key={len}
                type="button"
                role="radio"
                aria-checked={roundSeconds === len}
                className={`shadow-flow-length-btn ${roundSeconds === len ? "shadow-flow-length-btn--active" : ""}`}
                onClick={() => setRoundSeconds(len)}
              >
                {formatRoundLength(len)}
              </button>
            ))}
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
          </div>
        ) : null}
      </FlowPanel>

      <FlowAction onClick={() => onStartRound(roundSeconds)}>Start shadow round</FlowAction>
    </FlowShell>
  );
}
