"use client";

import { type ReactNode } from "react";
import { ModalShell, type ModalAccent } from "@/components/shared/ModalShell";

interface AnalysisSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent?: ModalAccent;
  compact?: boolean;
  bodyClassName?: string;
  children: ReactNode;
}

export function AnalysisSheet({
  open,
  onClose,
  title,
  subtitle,
  accent = "neutral",
  compact = false,
  bodyClassName,
  children,
}: AnalysisSheetProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      accent={accent}
      compact={compact}
      bodyClassName={bodyClassName}
    >
      {children}
    </ModalShell>
  );
}
