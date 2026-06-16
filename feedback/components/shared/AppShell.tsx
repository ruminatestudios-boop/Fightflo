"use client";

import type { ReactNode } from "react";
import { GlassPage } from "@/components/shared/GlassPage";

interface AppShellProps {
  children: ReactNode;
  showLogo?: boolean;
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  className?: string;
  dock?: ReactNode;
}

/** @deprecated Prefer GlassPage — kept for compatibility */
export function AppShell({
  children,
  showLogo = false,
  showBack = false,
  backHref,
  onBack,
  dock,
}: AppShellProps) {
  const hasBack = showBack || Boolean(backHref || onBack);

  return (
    <GlassPage showBack={hasBack || showLogo} backHref={backHref} onBack={onBack}>
      {children}
      {dock}
    </GlassPage>
  );
}
