"use client";

import { useId, useState } from "react";
import { AnalysisSheet } from "@/components/netflix/AnalysisSheet";
import {
  buildOverlayGuideContent,
  type OverlayGuideLegendItem,
} from "@/lib/copy/overlayGuide";
import type { PoseQualityReport, SportId } from "@/types";

interface OverlayGuideProps {
  sport: SportId;
  poseQuality?: PoseQualityReport | null;
  guardCalibrated?: boolean;
  isGuardMode?: boolean;
  /** compact = text link; rail = icon button for stepguide rail */
  variant?: "link" | "rail" | "pill";
  className?: string;
}

function LegendSwatch({ type }: { type: OverlayGuideLegendItem["swatch"] }) {
  const className = `overlay-guide-swatch overlay-guide-swatch--${type}`;

  if (type === "skeleton") {
    return (
      <span className={className} aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" className="overlay-guide-swatch-svg">
          <circle cx="12" cy="5.25" r="1.75" stroke="currentColor" strokeWidth="1.35" />
          <path
            d="M12 7.25v5.5M8.25 10.75h7.5M12 12.75l-2.75 4.5M12 12.75l2.75 4.5"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (type === "guard-ok") {
    return (
      <span className={className} aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" className="overlay-guide-swatch-svg">
          <line
            x1="5"
            y1="14.5"
            x2="19"
            y2="14.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeOpacity="0.45"
          />
          <circle cx="8" cy="10" r="2.1" fill="currentColor" />
          <circle cx="16" cy="10" r="2.1" fill="currentColor" />
        </svg>
      </span>
    );
  }

  if (type === "guard-bad") {
    return (
      <span className={className} aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" className="overlay-guide-swatch-svg">
          <line
            x1="5"
            y1="11.5"
            x2="19"
            y2="11.5"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeDasharray="2.5 2"
            strokeLinecap="round"
          />
          <circle cx="8" cy="15.75" r="2" fill="currentColor" fillOpacity="0.9" />
          <circle cx="16" cy="15.75" r="2" fill="currentColor" fillOpacity="0.9" />
        </svg>
      </span>
    );
  }

  if (type === "angle") {
    return (
      <span className={className} aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" className="overlay-guide-swatch-svg">
          <path
            d="M7.5 16.5h9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.55"
          />
          <path
            d="M7.5 16.5V11a4.5 4.5 0 0 1 9 0"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <text
            x="12"
            y="9.25"
            textAnchor="middle"
            className="overlay-guide-swatch-angle-text"
          >
            165°
          </text>
        </svg>
      </span>
    );
  }

  return (
    <TrailSwatch className={className} />
  );
}

function TrailSwatch({ className }: { className: string }) {
  const gradientId = useId();

  return (
    <span className={className} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" className="overlay-guide-swatch-svg">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#fa4141" />
          </linearGradient>
        </defs>
        <path
          d="M5.5 16.25c2.75-5.5 5.5-7.25 8.25-7.25s5.5 1.75 5.25 7.25"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="5.5" cy="16.25" r="1.6" fill="#34d399" />
        <circle cx="19" cy="16.25" r="1.6" fill="#fa4141" fillOpacity="0.85" />
      </svg>
    </span>
  );
}

export function OverlayGuideContent({
  sport,
  poseQuality,
  guardCalibrated,
  isGuardMode,
}: Omit<OverlayGuideProps, "variant" | "className">) {
  const content = buildOverlayGuideContent(sport, {
    poseQuality,
    guardCalibrated,
    isGuardMode,
  });

  return (
    <div className="overlay-guide-content">
      {content.qualityNote ? (
        <div className="overlay-guide-quality">
          <p className="overlay-guide-quality-label">Tracking quality</p>
          <p className="overlay-guide-quality-body">{content.qualityNote}</p>
        </div>
      ) : null}

      <section className="overlay-guide-section">
        <p className="overlay-guide-section-label">On-screen overlay</p>
        <ul className="overlay-guide-legend">
          {content.legend.map((item) => (
            <li key={item.label} className="overlay-guide-legend-item">
              <LegendSwatch type={item.swatch} />
              <div className="overlay-guide-legend-copy">
                <p className="overlay-guide-legend-title">{item.label}</p>
                <p className="overlay-guide-legend-detail">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="overlay-guide-section">
        <p className="overlay-guide-section-label">How we read your video</p>
        <ol className="overlay-guide-steps">
          {content.howItWorks.map((step, index) => (
            <li key={step} className="overlay-guide-step">
              <span className="overlay-guide-step-num" aria-hidden>
                {index + 1}
              </span>
              <p className="overlay-guide-step-body">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="overlay-guide-section">
        <p className="overlay-guide-section-label">Set your expectations</p>
        <ul className="overlay-guide-expectations">
          {content.expectations.map((line) => (
            <li key={line} className="overlay-guide-expectation">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function OverlayGuide({
  sport,
  poseQuality,
  guardCalibrated,
  isGuardMode,
  variant = "link",
  className = "",
}: OverlayGuideProps) {
  const [open, setOpen] = useState(false);

  const trigger =
    variant === "rail" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`stepguide-rail-btn ${className}`}
        aria-label="How to read the pose overlay"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    ) : variant === "pill" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`overlay-guide-pill ${className}`}
      >
        How the overlay works
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-sm text-white/50 underline-offset-2 hover:text-white/75 hover:underline ${className}`}
      >
        How to read the overlay
      </button>
    );

  return (
    <>
      {trigger}
      <AnalysisSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Pose overlay guide"
        subtitle="What you see on the video"
        accent="neutral"
        bodyClassName="overlay-guide-sheet-body"
      >
        <OverlayGuideContent
          sport={sport}
          poseQuality={poseQuality}
          guardCalibrated={guardCalibrated}
          isGuardMode={isGuardMode}
        />
      </AnalysisSheet>
    </>
  );
}
