"use client";

import { ProgressBar } from "@/components/upload/ProgressBar";

interface AnalysisProgressViewProps {
  eyebrow: string;
  headline: string;
  message: string;
  progress: number;
  footer?: string;
  className?: string;
}

export function AnalysisProgressView({
  eyebrow,
  headline,
  message,
  progress,
  footer = "Usually 2–5 minutes",
  className = "",
}: AnalysisProgressViewProps) {
  return (
    <div className={`text-center ${className}`}>
      <p className="text-sm text-white/40">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-medium text-white">{headline}</h1>
      <div className="mx-auto mt-10 max-w-xs">
        <ProgressBar progress={progress} message={message} />
      </div>
      <p className="mt-6 text-xs text-white/30">{footer}</p>
    </div>
  );
}
