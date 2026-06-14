"use client";

import type { ReactNode } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { LogoHeader } from "@/components/shared/LogoHeader";

interface NetflixShellProps {
  children: ReactNode;
  backHref?: string;
  onBack?: () => void;
  onLogoClick?: () => void;
  topBar?: ReactNode;
  /** Float chrome over full-bleed content (report video) */
  immersive?: boolean;
}

export function NetflixShell({
  children,
  backHref,
  onBack,
  onLogoClick,
  topBar,
  immersive = false,
}: NetflixShellProps) {
  const showBack = Boolean(backHref || onBack);

  return (
    <div
      className={`netflix-viewport relative bg-black text-white ${immersive ? "netflix-viewport--immersive" : ""}`}
    >
      <div className="netflix-topbar">
        {showBack ? (
          backHref ? (
            <BackButton href={backHref} />
          ) : (
            <BackButton onClick={onBack} />
          )
        ) : (
          <div className="w-10" />
        )}
        <LogoHeader
          size="sm"
          align="center"
          className="pointer-events-auto"
          onClick={onLogoClick}
        />
        <div className="w-10" />
      </div>
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
