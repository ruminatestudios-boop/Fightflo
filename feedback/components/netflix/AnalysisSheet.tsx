"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface AnalysisSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent?: "green" | "orange" | "red" | "neutral";
  children: ReactNode;
}

const ACCENT_BORDER: Record<string, string> = {
  green: "border-emerald-500/40",
  orange: "border-[#ff9500]/40",
  red: "border-[#fa4141]/50",
  neutral: "border-white/10",
};

export function AnalysisSheet({
  open,
  onClose,
  title,
  subtitle,
  accent = "neutral",
  children,
}: AnalysisSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="netflix-modal-root" role="dialog" aria-modal="true">
      <button
        type="button"
        className="netflix-modal-backdrop"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className={`netflix-modal-sheet border-t-2 ${ACCENT_BORDER[accent]}`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {subtitle && (
              <p className="text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
                {subtitle}
              </p>
            )}
            <h2 className="netflix-title mt-1 text-2xl text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-white/10 text-white/70"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="netflix-modal-body scrollbar-none max-h-[55vh] overflow-y-auto pb-2">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
