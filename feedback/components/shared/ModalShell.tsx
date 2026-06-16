"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ModalAccent = "green" | "orange" | "red" | "neutral";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  titleId?: string;
  subtitle?: string;
  accent?: ModalAccent;
  footer?: ReactNode;
  showClose?: boolean;
  /** Shrink to content height instead of fixed tall sheet */
  compact?: boolean;
  /** Defaults to 200 — PWA install uses 210 so it can stack above nav when needed */
  zIndex?: number;
  className?: string;
  bodyClassName?: string;
}

const ACCENT_BORDER: Record<ModalAccent, string> = {
  green: "ff-modal-sheet--green",
  orange: "ff-modal-sheet--orange",
  red: "ff-modal-sheet--red",
  neutral: "ff-modal-sheet--neutral",
};

export function ModalShell({
  open,
  onClose,
  children,
  title,
  titleId,
  subtitle,
  accent = "neutral",
  footer,
  showClose = true,
  compact = false,
  zIndex = 200,
  className = "",
  bodyClassName = "",
}: ModalShellProps) {
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
    <div
      className="ff-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{ zIndex }}
    >
      <button
        type="button"
        className="ff-modal-backdrop"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className={`ff-modal-sheet ${ACCENT_BORDER[accent]} ${compact ? "ff-modal-sheet--compact" : ""} ${className}`.trim()}
      >
        <div className="ff-modal-handle" aria-hidden />

        {(title || showClose) && (
          <div className="ff-modal-header">
            <div className="ff-modal-header-copy">
              {subtitle ? (
                <p className="ff-modal-subtitle">{subtitle}</p>
              ) : null}
              {title ? (
                <h2 id={titleId} className="ff-modal-title">
                  {title}
                </h2>
              ) : null}
            </div>
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                className="ff-modal-close"
                aria-label="Close"
              >
                ×
              </button>
            ) : null}
          </div>
        )}

        <div className={`ff-modal-body scrollbar-none ${bodyClassName}`}>
          {children}
        </div>

        {footer ? <div className="ff-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
