"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  index?: number;
}

export function GlassCard({
  children,
  selected = false,
  onClick,
  className = "",
  index = 0,
}: GlassCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      whileTap={{ scale: 0.98 }}
      style={{ touchAction: "manipulation" }}
      className={`w-full rounded-2xl p-5 text-left transition-all duration-200 ${
        selected ? "nike-card-selected" : "nike-card hover:border-white/[0.12]"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}
