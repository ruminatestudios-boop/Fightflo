"use client";

import Link from "next/link";
import { useNavigateBack } from "@/hooks/useNavigateBack";

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  /** Use router.back() with fallback to `/` when no href/onClick provided */
  useHistory?: boolean;
  fallbackHref?: string;
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
  useHistory = false,
  fallbackHref = "/",
  className = "",
  "aria-label": ariaLabel = "Back",
}: BackButtonProps) {
  const navigateBack = useNavigateBack(fallbackHref);
  const classes = `ff-back-btn ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        <BackChevron />
      </Link>
    );
  }

  const handleClick = onClick ?? (useHistory ? navigateBack : undefined);

  if (!handleClick) return null;

  return (
    <button type="button" onClick={handleClick} className={classes} aria-label={ariaLabel}>
      <BackChevron />
    </button>
  );
}
