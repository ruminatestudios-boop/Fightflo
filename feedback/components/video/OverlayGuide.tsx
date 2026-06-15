"use client";

import { useState } from "react";
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
  if (type === "skeleton") {
    return (
      <span className="overlay-guide-swatch overlay-guide-swatch--skeleton" aria-hidden />
    );
  }
  if (type === "guard-ok") {
    return (
      <span className="overlay-guide-swatch overlay-guide-swatch--guard-ok" aria-hidden />
    );
  }
  if (type === "guard-bad") {
    return (
      <span className="overlay-guide-swatch overlay-guide-swatch--guard-bad" aria-hidden />
    );
  }
  if (type === "angle") {
    return (
      <span className="overlay-guide-swatch overlay-guide-swatch--angle" aria-hidden>
        165°
      </span>
    );
  }
  return (
    <span className="overlay-guide-swatch overlay-guide-swatch--trail" aria-hidden />
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
    <div className="overlay-guide-content space-y-6">
      {content.qualityNote && (
        <p className="rounded-card border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/70">
          {content.qualityNote}
        </p>
      )}

      <section>
        <h3 className="text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
          On-screen overlay
        </h3>
        <ul className="mt-3 space-y-3">
          {content.legend.map((item) => (
            <li key={item.label} className="flex gap-3">
              <LegendSwatch type={item.swatch} />
              <div>
                <p className="text-sm font-medium text-white/90">{item.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/55">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
          How we read your video
        </h3>
        <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-white/60">
          {content.howItWorks.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
          Set your expectations
        </h3>
        <ul className="mt-3 space-y-2">
          {content.expectations.map((line) => (
            <li
              key={line}
              className="flex gap-2 text-sm leading-relaxed text-white/55 before:shrink-0 before:content-['·']"
            >
              <span>{line}</span>
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
