"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

const PHASE_TIME_ESTIMATES = ["1–2 min", "2–3 min", "under 1 min"];

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
  const smoothed = useRef(clamped);
  const [displayProgress, setDisplayProgress] = useState(clamped);

  // Smoothly advance — never jump backwards
  useEffect(() => {
    if (clamped > smoothed.current) {
      smoothed.current = clamped;
      setDisplayProgress(clamped);
    }
  }, [clamped]);

  return (
    <div className={`loading-panel-stage ${className}`}>
      <div className="loading-panel">
        <div className="loading-panel-card">
          <p className="loading-panel-kicker">{eyebrow}</p>

          {/* Step indicators */}
          <div className="loading-panel-steps" aria-label="Analysis stages">
            {USER_ANALYSIS_PHASES.map((phase, i) => {
              const done = phase.index < userPhase.index;
              const active = phase.index === userPhase.index;
              return (
                <div
                  key={phase.index}
                  className={`loading-panel-step ${done ? "loading-panel-step--done" : active ? "loading-panel-step--active" : "loading-panel-step--pending"}`}
                >
                  <div className="loading-panel-step-dot">
                    {done ? (
                      <svg viewBox="0 0 10 10" fill="none" className="loading-panel-step-check">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="loading-panel-step-num">{phase.index}</span>
                    )}
                  </div>
                  <div className="loading-panel-step-text">
                    <span className="loading-panel-step-label">{phase.shortLabel}</span>
                    {active ? (
                      <span className="loading-panel-step-est">{PHASE_TIME_ESTIMATES[i]}</span>
                    ) : null}
                  </div>
                  {i < USER_ANALYSIS_PHASES.length - 1 ? (
                    <div className={`loading-panel-step-line ${done ? "loading-panel-step-line--done" : ""}`} aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="loading-panel-divider" aria-hidden />

          <p className="loading-panel-status">{message}</p>

          {/* Red line progress bar */}
          <div className="loading-panel-line-track" aria-hidden>
            <div
              className="loading-panel-line-fill"
              style={{ width: `${displayProgress}%` }}
            />
          </div>

          {footer ? (
            <p className="glass-meta loading-panel-footer">{footer}</p>
          ) : (
            <p className="glass-meta loading-panel-footer">
              <span className="loading-panel-keyword">
                Step {userPhase.index} of 3
              </span>
              {" — "}
              {userPhase.detail}. Keep this screen open.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
