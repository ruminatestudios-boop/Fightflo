"use client";

import { motion } from "framer-motion";

interface BackgroundPulseProps {
  flashColor?: string;
  intensity?: number;
  clearMode?: boolean;
}

export function BackgroundPulse({
  flashColor = "transparent",
  intensity = 0,
  clearMode = false,
}: BackgroundPulseProps) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#111111]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#161616] via-[#111111] to-[#0d0d0d]" />

      <motion.div
        animate={{ opacity: intensity * (clearMode ? 0.75 : 0.5) }}
        transition={{ duration: clearMode ? 0.12 : 0.06 }}
        className="absolute inset-0"
        style={{ backgroundColor: flashColor }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
