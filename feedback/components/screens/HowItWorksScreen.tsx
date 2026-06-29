"use client";

interface HowItWorksScreenProps {
  onGetStarted: () => void;
}

const STEPS = [
  {
    title: "Upload or record a clip",
    body: "Film bag work, pads, or sparring — or track your guard live while you train.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16V4" />
        <path d="M8.5 7.5L12 4l3.5 3.5" />
        <path d="M4 16.5V20a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
      </svg>
    ),
  },
  {
    title: "Get alerted when your guard drops",
    body: "Real-time tracking buzzes the moment your hands drop below chin level.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "See if your last fault improved",
    body: "Re-upload the same drill and we compare it to your last session.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12.75L11.25 15 15 9.75" />
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

/** One-time "how it works" screen — shown once ever, then dismissed for good. */
export function HowItWorksScreen({ onGetStarted }: HowItWorksScreenProps) {
  return (
    <div className="how-it-works-root">
      <div className="how-it-works-image" aria-hidden />

      <div className="how-it-works-content">
        <div className="how-it-works-gradient" aria-hidden />

        <h1 className="how-it-works-headline">
          Upload your fight footage.
          <br />
          <span className="how-it-works-headline-accent">Know exactly</span> what to fix.
        </h1>

        <div className="how-it-works-steps">
          {STEPS.map((step) => (
            <div key={step.title} className="how-it-works-step">
              <span className="how-it-works-step-icon" aria-hidden>
                {step.icon}
              </span>
              <div className="how-it-works-step-text">
                <p className="how-it-works-step-title">{step.title}</p>
                <p className="how-it-works-step-body">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="ff-primary-btn how-it-works-cta"
          onClick={onGetStarted}
        >
          Get started
        </button>
        <p className="how-it-works-cta-note">3 free scans — no card needed</p>
      </div>
    </div>
  );
}
