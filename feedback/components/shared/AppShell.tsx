"use client";

import type { ReactNode } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { LogoHeader } from "@/components/shared/LogoHeader";
import { useNavigateBack } from "@/hooks/useNavigateBack";

interface AppShellProps {
  children: ReactNode;
  showLogo?: boolean;
  /** Show back control — uses browser history unless overridden */
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  className?: string;
  dock?: ReactNode;
}

export function AppShell({
  children,
  showLogo = false,
  showBack = false,
  backHref,
  onBack,
  className = "",
  dock,
}: AppShellProps) {
  const navigateBack = useNavigateBack();
  const hasBack = showBack || Boolean(backHref || onBack);
  const backClick = onBack ?? navigateBack;

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-sm flex-col bg-black px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-white ${className}`}
    >
      {showLogo && (
        <header className="relative mb-6 flex min-h-10 items-center justify-center">
          {hasBack ? (
            backHref ? (
              <BackButton href={backHref} className="absolute left-0" />
            ) : (
              <BackButton onClick={backClick} className="absolute left-0" />
            )
          ) : null}
          <LogoHeader size="sm" />
        </header>
      )}

      {!showLogo && hasBack ? (
        <div className="mb-4 flex justify-start">
          {backHref ? (
            <BackButton href={backHref} />
          ) : (
            <BackButton onClick={backClick} />
          )}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        {children}
      </div>

      {dock}
    </div>
  );
}
