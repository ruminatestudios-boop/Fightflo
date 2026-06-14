"use client";

interface BackButtonProps {
  onClick: () => void;
  className?: string;
}

export function BackButton({ onClick, className = "" }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-[#8e9297] transition-colors hover:border-white/[0.15] hover:text-white ${className}`}
      aria-label="Back"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
