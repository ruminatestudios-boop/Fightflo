"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoHeader } from "@/components/shared/LogoHeader";

interface AppShellProps {
  children: ReactNode;
  showLogo?: boolean;
  backHref?: string;
  className?: string;
  dock?: ReactNode;
}

export function AppShell({
  children,
  showLogo = false,
  backHref,
  className = "",
  dock,
}: AppShellProps) {
  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-sm flex-col bg-black px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-white ${className}`}
    >
      {showLogo && (
        <header className="relative mb-6 flex min-h-8 items-center justify-center">
          <LogoHeader size="sm" />
          {backHref && (
            <Link
              href={backHref}
              className="absolute right-0 text-xs text-[#6b6b6b] transition-colors hover:text-white"
            >
              Back
            </Link>
          )}
        </header>
      )}

      {!showLogo && backHref && (
        <div className="mb-4 flex justify-end">
          <Link
            href={backHref}
            className="text-xs text-[#6b6b6b] transition-colors hover:text-white"
          >
            Back
          </Link>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        {children}
      </div>

      {dock}
    </div>
  );
}
