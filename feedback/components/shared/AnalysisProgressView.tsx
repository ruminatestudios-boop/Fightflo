"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SegmentedProgressBar } from "@/components/shared/SegmentedProgressBar";
import {
  USER_ANALYSIS_PHASES,
  type UserAnalysisPhase,
} from "@/lib/analysis/userPhases";

interface AnalysisProgressViewProps {
  eyebrow: string;
  headline: string;
  message: string;
  progress: number;
  userPhase: UserAnalysisPhase;
  footer?: ReactNode;
  className?: string;
}

function phaseLocalPercent(overall: number, phaseIndex: 1 | 2 | 3): number {
  const slice = 100 / 3;
  const phaseStart = (phaseIndex - 1) * slice;
  const inPhase = overall - phaseStart;
  return Math.round(Math.min(100, Math.max(0, (inPhase / slice) * 100)));
}

export function AnalysisProgressView({
  eyebrow,
  headline,
  message,
  progress,
  userPhase,
  footer,
  className = "",
}: AnalysisProgressViewProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  const phaseLocal = phaseLocalPercent(clamped, userPhase.index);
  const prevProgress = useRef(clamped);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    const diff = Math.max(0, Math.round(clamped) - Math.round(prevProgress.current));
    if (diff > 0) setDelta(diff);
    prevProgress.current = clamped;
  }, [clamped]);

  return (
    <div className={`loading-panel-stage ${className}`}>
      <div className="loading-panel">
        <div className="loading-panel-card">
          <p className="loading-panel-kicker">{eyebrow}</p>

          <div className="loading-panel-tags" aria-label="Analysis stages">
            {USER_ANALYSIS_PHASES.map((phase) => {
              const done = phase.index < userPhase.index;
              const active = phase.index === userPhase.index;

              return (
                <span
                  key={phase.index}
                  className={`loading-panel-tag ${
                    done
                      ? "loading-panel-tag--done"
                      : active
                        ? "loading-panel-tag--active"
                        : ""
                  }`}
                >
                  {phase.shortLabel}
                </span>
              );
            })}
          </div>

          <h1 className="glass-greeting-title loading-panel-title">{headline}</h1>
          <div className="loading-panel-divider" aria-hidden />

          <p className="loading-panel-status">{message}</p>

          <div className="loading-panel-metrics">
            <span className="loading-panel-percent">
              {Math.round(clamped)}
              <span className="loading-panel-percent-suffix">%</span>
            </span>
            <div className="loading-panel-delta">
              <span className="loading-panel-delta-badge" aria-hidden>
                <svg viewBox="0 0 12 12" className="loading-panel-delta-icon">
                  <path
                    d="M2 8 L6 3 L10 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {delta > 0 ? delta : phaseLocal}%
              </span>
              <span className="loading-panel-delta-label">
                {delta > 0 ? "since last update" : "this phase"}
              </span>
            </div>
          </div>

          <SegmentedProgressBar progress={clamped} className="loading-panel-bar" />

          {footer ? (
            <p className="glass-meta loading-panel-footer">{footer}</p>
          ) : (
            <p className="glass-meta loading-panel-footer">
              <span className="loading-panel-keyword">
                Step {userPhase.index} of 3
              </span>
              {" — "}
              {userPhase.detail}. Usually 2–5 minutes total.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
