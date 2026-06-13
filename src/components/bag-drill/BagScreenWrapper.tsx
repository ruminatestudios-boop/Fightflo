"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AppTopBar } from "@/components/ui/AppTopBar";
import { BAG_TAB_BAR_PAD } from "@/components/bag-drill/BagTabBar";

interface BagScreenWrapperProps {
  children: ReactNode;
  className?: string;
  onBack?: () => void;
  onHome?: () => void;
  hideLogo?: boolean;
  /** Hub screens with sticky Train / Progress tab bar */
  hubScreen?: boolean;
}

/** Full-viewport shell for bag drill — no max-width column */
export function BagScreenWrapper({
  children,
  className = "",
  onBack,
  onHome,
  hideLogo = false,
  hubScreen = false,
}: BagScreenWrapperProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`fixed inset-0 z-10 flex h-dvh w-full flex-col overflow-hidden bg-black px-5 pt-[max(2rem,env(safe-area-inset-top))] ${
        hubScreen ? BAG_TAB_BAR_PAD : "pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      } ${className}`}
    >
      {!hideLogo && (
        <AppTopBar
          onBack={hubScreen ? undefined : onBack}
          onHome={onHome}
          className="mb-4 shrink-0"
        />
      )}
      {children}
    </motion.div>
  );
}
