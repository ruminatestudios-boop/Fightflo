"use client";

import Link from "next/link";

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
}

function BackChevron() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function BackButton({
  href,
  onClick,
  className = "",
  "aria-label": ariaLabel = "Back",
}: BackButtonProps) {
  const classes = `ff-back-btn ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        <BackChevron />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} aria-label={ariaLabel}>
      <BackChevron />
    </button>
  );
}
