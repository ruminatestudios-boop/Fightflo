"use client";

import { ProgressBar } from "@/components/upload/ProgressBar";
import { AnalysisPhaseIndicator } from "@/components/shared/AnalysisPhaseIndicator";
import type { UserAnalysisPhase } from "@/lib/analysis/userPhases";

interface AnalysisProgressViewProps {
  eyebrow: string;
  headline: string;
  message: string;
  progress: number;
  userPhase: UserAnalysisPhase;
  footer?: string;
  className?: string;
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
  const footerText =
    footer ??
    `Step ${userPhase.index} of 3 — ${userPhase.detail}. Usually 2–5 minutes total.`;

  return (
    <div className={`analysis-progress-view ${className}`}>
      <AnalysisPhaseIndicator currentPhase={userPhase} />

      <p className="mt-6 text-sm text-white/40">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-medium text-white">{headline}</h1>
      <div className="mx-auto mt-8 max-w-xs">
        <ProgressBar progress={progress} message={message} />
      </div>
      <p className="mt-6 text-xs text-white/30">{footerText}</p>
    </div>
  );
}
