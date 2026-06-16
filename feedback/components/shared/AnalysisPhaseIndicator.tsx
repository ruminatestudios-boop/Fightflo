"use client";

import {
  USER_ANALYSIS_PHASES,
  type UserAnalysisPhase,
} from "@/lib/analysis/userPhases";

interface AnalysisPhaseIndicatorProps {
  currentPhase: UserAnalysisPhase;
  className?: string;
}

export function AnalysisPhaseIndicator({
  currentPhase,
  className = "",
}: AnalysisPhaseIndicatorProps) {
  return (
    <div className={`analysis-phase-indicator ${className}`} aria-live="polite">
      <p className="analysis-phase-kicker">
        Step {currentPhase.index} of {USER_ANALYSIS_PHASES.length}
      </p>

      <ol className="analysis-phase-track" aria-label="Analysis progress">
        {USER_ANALYSIS_PHASES.map((phase) => {
          const done = phase.index < currentPhase.index;
          const active = phase.index === currentPhase.index;

          return (
            <li
              key={phase.index}
              className={`analysis-phase-node ${
                done
                  ? "analysis-phase-node--done"
                  : active
                    ? "analysis-phase-node--active"
                    : ""
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span className="analysis-phase-dot" aria-hidden>
                {done ? "✓" : phase.index}
              </span>
              <span className="analysis-phase-label">{phase.shortLabel}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
