"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { HeroMedia } from "@/components/ui/HeroMedia";
import { HERO_ONBOARDING_POSTER, ONBOARDING_VIDEO, ONBOARDING_VIDEO_CDN } from "@/lib/media";

interface IntroScreenProps {
  onGetStarted: () => void;
  onSkip: () => void;
  title?: ReactNode;
  subtitle?: string;
  getStartedLabel?: string;
}

const DEFAULT_TITLE = (
  <>
    You&apos;re in
    <br />
    the fight now
  </>
);

const DEFAULT_SUBTITLE =
  "Reactive shadowboxing with real fight rhythm — pressure, silence, and explosive exchanges.";

/** Strava-style full-screen intro — blocks until user taps Get started */
export function IntroScreen({
  onGetStarted,
  onSkip,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  getStartedLabel = "Get started",
}: IntroScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-hidden bg-black"
      style={{ minHeight: "100dvh" }}
    >
      <HeroMedia
        videoSrc={ONBOARDING_VIDEO}
        fallbackVideoSrc={ONBOARDING_VIDEO_CDN}
        posterSrc={HERO_ONBOARDING_POSTER}
        overlay="strava"
        eager
      />

      <div className="relative z-10 flex h-full min-h-[100dvh] w-full flex-col">
        <div className="flex-1" />

        <div className="px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-center"
          >
            <h1 className="font-display text-balance text-[1.75rem] leading-[1.05] tracking-wide text-white sm:text-[2rem]">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-[320px] text-[15px] leading-relaxed text-white/70">
              {subtitle}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            className="mt-8 space-y-3"
          >
            <Button onClick={onGetStarted}>{getStartedLabel}</Button>
            <button
              type="button"
              onClick={onSkip}
              className="mt-3 w-full py-2.5 text-sm text-white/55 transition-colors hover:text-white/85"
            >
              Skip intro
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
