"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AppTopBar } from "@/components/ui/AppTopBar";

interface ScreenWrapperProps {
  children: ReactNode;
  className?: string;
  hideLogo?: boolean;
  onBack?: () => void;
  onHome?: () => void;
  topBarTrailing?: ReactNode;
}

export function ScreenWrapper({
  children,
  className = "",
  hideLogo = false,
  onBack,
  onHome,
  topBarTrailing,
}: ScreenWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className={`app-shell relative z-10 flex min-h-dvh flex-col bg-black px-5 pb-8 pt-10 ${className}`}
    >
      {!hideLogo && <AppTopBar onBack={onBack} onHome={onHome} trailing={topBarTrailing} />}
      {children}
    </motion.div>
  );
}
