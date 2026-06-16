"use client";

import type { ReactNode } from "react";
import { NetflixShell } from "@/components/netflix/NetflixShell";

interface GlassPageProps {
  children: ReactNode;
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  onLogoClick?: () => void;
  immersive?: boolean;
  innerClassName?: string;
}

/** Standard app page — fixed logo bar + glass background (home / loading look) */
export function GlassPage({
  children,
  showBack = false,
  backHref,
  onBack,
  onLogoClick,
  immersive = false,
  innerClassName = "glass-home-inner",
}: GlassPageProps) {
  return (
    <NetflixShell
      showBack={showBack}
      backHref={backHref}
      onBack={onBack}
      onLogoClick={onLogoClick}
      immersive={immersive}
    >
      <div className="glass-home">
        {!immersive ? (
          <>
            <div className="glass-orb glass-orb--a" aria-hidden />
            <div className="glass-orb glass-orb--b" aria-hidden />
          </>
        ) : null}
        <div className={innerClassName}>{children}</div>
      </div>
    </NetflixShell>
  );
}
