"use client";

import { HeroMedia } from "@/components/shared/HeroMedia";
import { INTRO_COPY } from "@/lib/copy";
import { INTRO_VIDEO, INTRO_VIDEO_FALLBACK } from "@/lib/media";

interface FeedbackIntroScreenProps {
  onGetStarted: () => void;
}

/** Full-screen intro — blocks until user taps Get started */
export function FeedbackIntroScreen({ onGetStarted }: FeedbackIntroScreenProps) {
  return (
    <div
      className="feedback-intro-root fixed inset-0 z-50 h-[100dvh] w-full overflow-hidden bg-black"
      style={{ minHeight: "100dvh" }}
    >
      <div className="feedback-intro-media pointer-events-none absolute inset-0 z-0">
        <HeroMedia
          videoSrc={INTRO_VIDEO}
          fallbackVideoSrc={INTRO_VIDEO_FALLBACK}
          overlay="strava"
          eager
        />
      </div>

      <div className="feedback-intro-content pointer-events-none relative z-10 flex h-full min-h-[100dvh] w-full flex-col">
        <div className="flex-1" />

        <div className="feedback-intro-footer pointer-events-auto relative px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
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
              className="ff-primary-btn"
            >
              {INTRO_COPY.getStartedLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
