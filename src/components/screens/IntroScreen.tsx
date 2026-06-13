"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { HERO_ONBOARDING_POSTER, ONBOARDING_VIDEO, ONBOARDING_VIDEO_CDN } from "@/lib/media";
import { HeroMedia } from "@/components/ui/HeroMedia";

interface IntroScreenProps {
  onGetStarted: () => void;
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
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  getStartedLabel = "Get started",
}: IntroScreenProps) {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 h-[100dvh] w-full overflow-hidden bg-black"
      style={{ minHeight: "100dvh" }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <HeroMedia
          videoSrc={ONBOARDING_VIDEO}
          fallbackVideoSrc={ONBOARDING_VIDEO_CDN}
          posterSrc={HERO_ONBOARDING_POSTER}
          overlay="strava"
          eager
        />
      </div>

      <div className="pointer-events-none relative z-10 flex h-full min-h-[100dvh] w-full flex-col">
        <div className="flex-1" />

        <div className="pointer-events-auto relative px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent"
            aria-hidden
          />
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
              className="font-display flex h-14 w-full cursor-pointer items-center justify-center rounded-full bg-white text-[13px] tracking-[0.14em] text-black transition-colors hover:bg-[#e8e8e8] active:bg-[#d4d4d4]"
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
