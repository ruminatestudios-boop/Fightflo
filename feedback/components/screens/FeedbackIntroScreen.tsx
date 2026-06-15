"use client";

import { useEffect, useRef } from "react";
import { HeroMedia } from "@/components/shared/HeroMedia";
import { INTRO_COPY } from "@/lib/copy";
import { INTRO_VIDEO, INTRO_VIDEO_FALLBACK } from "@/lib/media";
import { withBasePath } from "@/lib/paths";

interface FeedbackIntroScreenProps {
  onGetStarted: () => void;
}

/** Full-screen intro — blocks until user taps Get started */
export function FeedbackIntroScreen({ onGetStarted }: FeedbackIntroScreenProps) {
  const ctaRef = useRef<HTMLAnchorElement>(null);

  // Native listener survives partial hydration / stale HMR bundles.
  useEffect(() => {
    const cta = ctaRef.current;
    if (!cta) return;

    const onActivate = (event: Event) => {
      event.preventDefault();
      onGetStarted();
    };

    cta.addEventListener("click", onActivate);

    return () => {
      cta.removeEventListener("click", onActivate);
    };
  }, [onGetStarted]);

  return (
    <div className="feedback-intro-root">
      <div className="feedback-intro-media" aria-hidden>
        <HeroMedia
          videoSrc={INTRO_VIDEO}
          fallbackVideoSrc={INTRO_VIDEO_FALLBACK}
          overlay="strava"
          eager
        />
      </div>

      <div className="feedback-intro-content">
        <div className="feedback-intro-footer">
          <div className="feedback-intro-footer-gradient" aria-hidden />
          <div className="feedback-intro-footer-copy">
            <h1 className="font-display text-balance text-[1.75rem] leading-[1.05] tracking-wide text-white sm:text-[2rem]">
              {INTRO_COPY.headline}
            </h1>
            <p className="mx-auto mt-4 max-w-[320px] text-[15px] leading-relaxed text-white/70">
              {INTRO_COPY.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="feedback-intro-actions">
        <a
          ref={ctaRef}
          href={withBasePath("/?started=1")}
          className="ff-primary-btn feedback-intro-get-started"
        >
          {INTRO_COPY.getStartedLabel}
        </a>
      </div>
    </div>
  );
}
