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
      <p className="netflix-eyebrow">{eyebrow}</p>
      <h1 className="netflix-display mx-auto mt-4 max-w-[12rem]">{headline}</h1>
      <div className="mx-auto mt-10 w-full max-w-xs">
        <ProgressBar progress={progress} message={message} />
      </div>
      <p className="mt-4 text-xs text-white/35">{footer}</p>
    </div>
  );
}
