"use client";

import type { ReactNode } from "react";

interface SessionControlBarProps {
  isPaused?: boolean;
  showStart?: boolean;
  showPause?: boolean;
  showSkip?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop: () => void;
  onSkip?: () => void;
}

function IconButton({
  label,
  onClick,
  accent = false,
  children,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-14 w-14 items-center justify-center rounded-xl border transition-colors active:scale-95 ${
        accent
          ? "border-[#fa4141]/50 bg-[#fa4141]/10 text-[#fa4141]"
          : "border-white/10 bg-white/[0.04] text-white hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export function SessionControlBar({
  isPaused = false,
  showStart = false,
  showPause = true,
  showSkip = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onSkip,
}: SessionControlBarProps) {
  return (
    <div className="flex items-center justify-center gap-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
      {showStart && onStart && (
        <IconButton label="Start" onClick={onStart} accent>
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </IconButton>
      )}

      {showPause && !isPaused && onPause && (
        <IconButton label="Pause" onClick={onPause}>
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
          </svg>
        </IconButton>
      )}

      {showPause && isPaused && onResume && (
        <IconButton label="Resume" onClick={onResume} accent>
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </IconButton>
      )}

      {showSkip && onSkip && (
        <IconButton label="Skip rest" onClick={onSkip}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </IconButton>
      )}

      <IconButton label="Stop session" onClick={onStop}>
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      </IconButton>
    </div>
  );
}
