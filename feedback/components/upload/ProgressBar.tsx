"use client";

import { DotGridProgress } from "@/components/shared/DotGridProgress";

interface ProgressBarProps {
  progress: number;
  message: string;
}

export function ProgressBar({ progress, message }: ProgressBarProps) {
  return <DotGridProgress progress={progress} message={message} />;
}
