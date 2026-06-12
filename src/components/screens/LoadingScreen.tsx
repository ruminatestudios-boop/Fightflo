"use client";

import { motion } from "framer-motion";
import { LogoHeader } from "@/components/ui/LogoHeader";

/** Brief splash — intro video lives on IntroScreen only */
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <LogoHeader size="lg" align="center" />
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-10 h-0.5 w-24 origin-center bg-[#fa4141]/60"
        />
      </motion.div>
    </div>
  );
}
