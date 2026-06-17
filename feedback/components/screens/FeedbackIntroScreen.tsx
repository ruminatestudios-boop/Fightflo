"use client";

import { HeroMedia } from "@/components/shared/HeroMedia";
import { INTRO_COPY } from "@/lib/copy";
import { INTRO_VIDEO, INTRO_VIDEO_FALLBACK } from "@/lib/media";
import { withBasePath } from "@/lib/paths";

const INTRO_SKIP_HREF = withBasePath("/?intro=skip");

interface FeedbackIntroScreenProps {
  onGetStarted: () => void;
}

/** Full-screen intro — blocks until user taps Get started */
export function FeedbackIntroScreen({ onGetStarted }: FeedbackIntroScreenProps) {
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
        <div className="feedback-intro-spacer" aria-hidden />

        <div className="feedback-intro-footer">
          <div className="feedback-intro-footer-gradient" aria-hidden />
          <div className="feedback-intro-footer-copy">
            <h1 className="text-hero text-balance text-[1.75rem] leading-[1.15] text-white sm:text-[2rem] feedback-intro-headline">
              {INTRO_COPY.headline}
            </h1>
            <p className="mx-auto mt-4 max-w-[360px] text-[15px] leading-relaxed text-white/70">
              {INTRO_COPY.subtitle}
            </p>
          </div>
          <div className="feedback-intro-actions">
            <a
              href={INTRO_SKIP_HREF}
              className="ff-primary-btn feedback-intro-get-started"
              onClick={(event) => {
                event.preventDefault();
                onGetStarted();
              }}
            >
              {INTRO_COPY.getStartedLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
