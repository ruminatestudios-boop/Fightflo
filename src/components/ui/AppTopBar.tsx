"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { LogoHeader } from "@/components/ui/LogoHeader";

interface AppTopBarProps {
  onBack?: () => void;
  onHome?: () => void;
  trailing?: ReactNode;
  className?: string;
  logoSize?: "sm" | "md" | "lg";
  logoVariant?: "dark" | "light";
}

export function AppTopBar({
  onBack,
  onHome,
  trailing,
  className = "",
  logoSize = "sm",
  logoVariant = "dark",
}: AppTopBarProps) {
  const router = useRouter();
  const goHome = onHome ?? (() => router.push("/"));

  return (
    <div className={`relative mb-8 flex min-h-10 w-full items-center ${className}`}>
      <div className="flex w-full justify-center">
        <LogoHeader
          size={logoSize}
          variant={logoVariant}
          align="center"
          className="w-auto"
          onHome={goHome}
        />
      </div>

      <div className="absolute right-0 z-10 flex items-center gap-2">
        {trailing ?? (onBack ? <BackButton onClick={onBack} /> : null)}
      </div>
    </div>
  );
}
