"use client";

import { HeroMedia } from "@/components/shared/HeroMedia";
import { INTRO_COPY } from "@/lib/copy";
import {
  INTRO_POSTER,
  INTRO_VIDEO,
  INTRO_VIDEO_FALLBACK,
} from "@/lib/media";

interface FeedbackIntroScreenProps {
  onGetStarted: () => void;
}

/** Full-screen intro — blocks until user taps Get started */
export function FeedbackIntroScreen({ onGetStarted }: FeedbackIntroScreenProps) {
  return (
    <div
      className="fixed inset-0 z-50 h-[100dvh] w-full overflow-hidden bg-black"
      style={{ minHeight: "100dvh" }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <HeroMedia
          videoSrc={INTRO_VIDEO}
          fallbackVideoSrc={INTRO_VIDEO_FALLBACK}
          posterSrc={INTRO_POSTER}
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
              {INTRO_COPY.headline}
            </h1>
            <p className="mx-auto mt-4 max-w-[320px] text-[15px] leading-relaxed text-white/70">
              {INTRO_COPY.subtitle}
            </p>
          </div>

          <div className="relative mt-8">
            <button
              type="button"
              onClick={onGetStarted}
              className="font-display flex h-14 w-full cursor-pointer items-center justify-center rounded-xl bg-white text-[13px] tracking-[0.14em] text-black transition-colors hover:bg-[#e8e8e8] active:bg-[#d4d4d4]"
              style={{ touchAction: "manipulation" }}
            >
              {INTRO_COPY.getStartedLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
