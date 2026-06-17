"use client";

import type { ReactNode } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { SiteTopBar } from "@/components/shared/SiteTopBar";
import { useNavigateBack } from "@/hooks/useNavigateBack";

interface NetflixShellProps {
  children: ReactNode;
  /** Show back control — uses browser history unless overridden */
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  onLogoClick?: () => void;
  topBar?: ReactNode;
  /** Float chrome over full-bleed content (report video) */
  immersive?: boolean;
}

export function NetflixShell({
  children,
  showBack = false,
  backHref,
  onBack,
  onLogoClick,
  topBar,
  immersive = false,
}: NetflixShellProps) {
  const navigateBack = useNavigateBack();
  const hasBack = showBack || Boolean(backHref || onBack);
  const backClick = onBack ?? navigateBack;

  return (
    <div
      className={`netflix-viewport relative text-white ${immersive ? "netflix-viewport--immersive" : ""}`}
    >
      <SiteTopBar
        showBack={hasBack}
        backHref={backHref}
        onBack={backClick}
        onLogoClick={onLogoClick}
        immersive={immersive}
      />
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
