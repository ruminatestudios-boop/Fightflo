"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";


interface IntroScreenProps {
  onGetStarted: () => void;
  title?: ReactNode;
  subtitle?: string;
  getStartedLabel?: string;
}

const DEFAULT_TITLE = (
  <>
    Your footage.
    <br />
    Real feedback.
  </>
);

const DEFAULT_SUBTITLE =
  "Upload any session. AI breaks down your guard, timing, and movement — then tells you exactly what to drill next.";

/** Strava-style full-screen intro — blocks until user taps Get started */
export function IntroScreen({
  onGetStarted,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  getStartedLabel = "Analyze My Session for FREE",
}: IntroScreenProps) {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="intro-screen-root fixed inset-0 z-40 h-[100dvh] w-full overflow-hidden bg-black"
      style={{ minHeight: "100dvh" }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <video
          src="https://cdn.shopify.com/videos/c/o/v/e8f16a43809e4314bb66ee7dfc4d0d3f.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black via-black/70 to-transparent" />
      </div>

      <div className="intro-screen-content pointer-events-none relative z-10 flex h-full min-h-[100dvh] w-full flex-col">
        <div className="flex-1" />

        <div className="intro-screen-footer pointer-events-auto relative px-6 pb-[max(4rem,env(safe-area-inset-bottom))] pt-6">
          <div className="relative text-center">
            <h1 className="font-display text-balance text-[1.75rem] leading-[1.05] tracking-wide text-white sm:text-[2rem]">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-[320px] text-[15px] leading-relaxed text-white/70">
              {subtitle}
            </p>
          </div>

          <div className="relative mt-8">
            <button
              type="button"
              onClick={onGetStarted}
              className="flex h-14 w-full cursor-pointer items-center justify-center rounded-xl bg-[#e53e3e] text-[16px] font-semibold text-white transition-colors hover:bg-[#c53030] active:bg-[#9b2c2c]"
              style={{ touchAction: "manipulation" }}
            >
              {getStartedLabel}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
