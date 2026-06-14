"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface NetflixShellProps {
  children: ReactNode;
  backHref?: string;
  topBar?: ReactNode;
}

export function NetflixShell({ children, backHref = "/", topBar }: NetflixShellProps) {
  return (
    <div className="netflix-viewport relative bg-black text-white">
      <div className="netflix-topbar">
        {backHref && (
          <Link
            href={backHref}
            className="netflix-back-btn"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        <Link href="/" className="netflix-logo">
          FEEDBACK<span className="text-[#e50914]">.</span>
        </Link>
        <div className="w-10" />
      </div>
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
