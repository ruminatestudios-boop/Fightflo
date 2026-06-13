"use client";

function CameraFlipIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
      <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
      <circle cx="12" cy="12" r="3" />
      <path d="m18 8-2 2 2 2" />
      <path d="m6 16 2-2-2-2" />
    </svg>
  );
}

interface CameraFlipButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  className?: string;
}

export function CameraFlipButton({
  onClick,
  disabled,
  label,
  className = "",
}: CameraFlipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/55 disabled:opacity-50 ${className}`}
    >
      <CameraFlipIcon />
    </button>
  );
}
