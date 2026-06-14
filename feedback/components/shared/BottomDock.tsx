"use client";

import Link from "next/link";

interface BottomDockProps {
  onUpload?: () => void;
  active?: "home" | "report";
}

export function BottomDock({ onUpload, active = "home" }: BottomDockProps) {
  return (
    <nav
      className="mt-auto flex items-end justify-center gap-5 pt-8 pb-2"
      aria-label="Main navigation"
    >
      <Link
        href="/"
        className={`dock-btn ${active === "home" ? "ring-1 ring-white/20" : "opacity-70"}`}
        aria-label="Home"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="5" r="1.5" />
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="19" cy="5" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
          <circle cx="5" cy="19" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
          <circle cx="19" cy="19" r="1.5" />
        </svg>
      </Link>

      <button
        type="button"
        className="dock-btn opacity-70"
        aria-label="Reports"
        disabled
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={onUpload}
        className="dock-btn-primary shrink-0"
        aria-label="Upload session"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0L8.25 13.5M12 9.75l3.75 3.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </nav>
  );
}
