"use client";

import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { LogoHeader } from "@/components/ui/LogoHeader";

interface AppTopBarProps {
  onBack?: () => void;
  trailing?: ReactNode;
  className?: string;
  logoSize?: "sm" | "md" | "lg";
  logoVariant?: "dark" | "light";
}

export function AppTopBar({
  onBack,
  trailing,
  className = "",
  logoSize = "sm",
  logoVariant = "dark",
}: AppTopBarProps) {
  return (
    <div className={`relative mb-8 flex min-h-10 w-full items-center ${className}`}>
      <div className="pointer-events-none flex w-full justify-center">
        <LogoHeader
          size={logoSize}
          variant={logoVariant}
          align="center"
          className="w-auto"
        />
      </div>

      <div className="absolute right-0 z-10 flex items-center gap-2">
        {trailing ?? (onBack ? <BackButton onClick={onBack} /> : null)}
      </div>
    </div>
  );
}
