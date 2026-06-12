"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AppTopBar } from "@/components/ui/AppTopBar";

interface BagScreenWrapperProps {
  children: ReactNode;
  className?: string;
  onBack?: () => void;
  hideLogo?: boolean;
}

/** Full-viewport shell for bag drill — no max-width column */
export function BagScreenWrapper({
  children,
  className = "",
  onBack,
  hideLogo = false,
}: BagScreenWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`fixed inset-0 z-10 flex h-dvh w-full flex-col overflow-hidden bg-black px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] ${className}`}
    >
      {!hideLogo && <AppTopBar onBack={onBack} className="mb-4 shrink-0" />}
      {children}
    </motion.div>
  );
}
