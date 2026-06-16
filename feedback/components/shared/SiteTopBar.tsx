"use client";

import { BackButton } from "@/components/shared/BackButton";
import { LogoHeader } from "@/components/shared/LogoHeader";

interface SiteTopBarProps {
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  onLogoClick?: () => void;
  immersive?: boolean;
}

/** Fixed logo + optional back — same position on every screen */
export function SiteTopBar({
  showBack = false,
  backHref,
  onBack,
  onLogoClick,
  immersive = false,
}: SiteTopBarProps) {
  return (
    <header
      className={`ff-topbar ${immersive ? "ff-topbar--immersive" : ""}`}
      aria-label="Site header"
    >
      <div className="ff-topbar-side">
        {showBack ? (
          backHref ? (
            <BackButton href={backHref} />
          ) : (
            <BackButton onClick={onBack} />
          )
        ) : (
          <span className="ff-topbar-slot" aria-hidden />
        )}
      </div>
      <LogoHeader
        size="sm"
        align="center"
        className="ff-topbar-logo"
        onClick={onLogoClick}
      />
      <div className="ff-topbar-side ff-topbar-side--end">
        <span className="ff-topbar-slot" aria-hidden />
      </div>
    </header>
  );
}
