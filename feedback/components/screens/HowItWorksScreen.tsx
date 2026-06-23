"use client";

interface HowItWorksScreenProps {
  onGetStarted: () => void;
}

/** One-time "how it works" screen — shown once ever, then dismissed for good. */
export function HowItWorksScreen({ onGetStarted }: HowItWorksScreenProps) {
  return (
    <div className="how-it-works-root">
      <div className="how-it-works-image" aria-hidden />

      <button
        type="button"
        className="how-it-works-skip"
        onClick={onGetStarted}
      >
        Skip
      </button>

      <div className="how-it-works-content">
        <div className="how-it-works-gradient" aria-hidden />
        <div className="how-it-works-copy">
          <h1 className="how-it-works-headline">
            Upload footage.
            <br />
            <span className="how-it-works-headline-accent">Know exactly</span> what to fix.
          </h1>
          <p className="how-it-works-body">
            Get timestamped coaching on your guard, footwork, and combos —
            then a drill to fix your biggest fault. Re-upload to check your progress.
          </p>
        </div>

        <button
          type="button"
          className="ff-primary-btn how-it-works-cta"
          onClick={onGetStarted}
        >
          Get started
        </button>
        <p className="how-it-works-cta-note">Your first scan is free — no card needed</p>
      </div>
    </div>
  );
}
