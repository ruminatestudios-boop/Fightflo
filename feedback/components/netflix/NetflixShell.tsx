"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoHeader } from "@/components/shared/LogoHeader";

interface NetflixShellProps {
  children: ReactNode;
  backHref?: string;
  topBar?: ReactNode;
  /** Float chrome over full-bleed content (report video) */
  immersive?: boolean;
}

export function NetflixShell({
  children,
  backHref = "/",
  topBar,
  immersive = false,
}: NetflixShellProps) {
  return (
    <div
      className={`netflix-viewport relative bg-black text-white ${immersive ? "netflix-viewport--immersive" : ""}`}
    >
      <div className="netflix-topbar">
        {backHref ? (
          <Link href={backHref} className="netflix-back-btn" aria-label="Back">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        ) : (
          <div className="w-10" />
        )}
        <LogoHeader size="sm" align="center" className="pointer-events-auto" />
        <div className="w-10" />
      </div>
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
