"use client";

import type {
  Annotation,
  LandmarkFrame,
  PositiveTimestamp,
  WeaknessTimestamp,
} from "./types";
import { AnnotatedPlayer } from "./AnnotatedPlayer";

interface SideBySidePlayerProps {
  /** Original uploaded footage */
  originalVideoUrl: string;
  /** Reference / elite comparison footage (optional) */
  referenceVideoUrl?: string;
  landmarks: LandmarkFrame[];
  annotations: Annotation[];
  weaknesses: WeaknessTimestamp[];
  positives: PositiveTimestamp[];
  referenceLabel?: string;
  userLabel?: string;
  className?: string;
}

export function SideBySidePlayer({
  originalVideoUrl,
  referenceVideoUrl,
  landmarks,
  annotations,
  weaknesses,
  positives,
  referenceLabel = "Reference",
  userLabel = "Your footage",
  className = "",
}: SideBySidePlayerProps) {
  if (referenceVideoUrl) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="label mb-2 px-1">{userLabel}</p>
            <AnnotatedPlayer
              videoUrl={originalVideoUrl}
              landmarks={landmarks}
              annotations={annotations}
              weaknesses={weaknesses}
              positives={positives}
            />
          </div>
          <div>
            <p className="label mb-2 px-1">{referenceLabel}</p>
            <div className="nike-card overflow-hidden rounded-xl">
              <div className="relative aspect-video bg-black">
                <video
                  src={referenceVideoUrl}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      <div>
        <p className="label mb-2 px-1">Raw footage</p>
        <div className="nike-card overflow-hidden rounded-xl">
          <div className="relative aspect-video bg-black">
            <video
              src={originalVideoUrl}
              className="h-full w-full object-contain"
              controls
              playsInline
            />
          </div>
        </div>
      </div>
      <div>
        <p className="label mb-2 px-1">Annotated analysis</p>
        <AnnotatedPlayer
          videoUrl={originalVideoUrl}
          landmarks={landmarks}
          annotations={annotations}
          weaknesses={weaknesses}
          positives={positives}
        />
      </div>
    </div>
  );
}
