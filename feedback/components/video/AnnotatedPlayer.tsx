"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Annotation,
  LandmarkFrame,
  PositiveTimestamp,
  TimelineMoment,
  WeaknessTimestamp,
} from "./types";
import { parseGuardCalibration } from "@/lib/analysis/guardCalibration";
import type { ConfirmedPoseEvent, PoseQualityReport, SportId } from "@/types";
import { jointForWeakness } from "@/lib/analysis/poseMetrics";
import { OverlayCanvas } from "./OverlayCanvas";
import { OverlayGuide } from "./OverlayGuide";
import { MomentCardList } from "./MomentCard";
import { TimelineMarkers } from "./TimelineMarkers";
import { parseTimestamp } from "./utils";

interface AnnotatedPlayerProps {
  videoUrl: string;
  landmarks: LandmarkFrame[];
  annotations: Annotation[];
  weaknesses: WeaknessTimestamp[];
  positives: PositiveTimestamp[];
  className?: string;
  confirmedEvents?: ConfirmedPoseEvent[];
  /** Persisted guard calibration from server analysis */
  landmarkSummary?: Record<string, unknown> | null;
  sport?: SportId;
  poseQuality?: PoseQualityReport | null;
  /** Full-bleed Netflix-style — minimal chrome */
  immersive?: boolean;
}

export function AnnotatedPlayer({
  videoUrl,
  landmarks,
  annotations,
  weaknesses,
  positives,
  className = "",
  confirmedEvents = [],
  landmarkSummary = null,
  sport = "boxing",
  poseQuality = null,
  immersive = false,
}: AnnotatedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const moments: TimelineMoment[] = useMemo(
    () => [
      ...positives.map((p, i) => ({
        id: `pos-${i}`,
        timestamp: p.timestamp,
        timeSeconds: p.timeSeconds,
        title: p.title,
        kind: "positive" as const,
      })),
      ...weaknesses.map((w, i) => ({
        id: `weak-${i}`,
        timestamp: w.timestamp,
        timeSeconds: w.timeSeconds,
        title: w.title,
        kind: "weakness" as const,
      })),
    ],
    [positives, weaknesses]
  );

  const guardCalibration = useMemo(
    () => parseGuardCalibration(landmarkSummary),
    [landmarkSummary]
  );
  const guardCalibrated = guardCalibration !== null;

  const seekTo = useCallback((timeSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timeSeconds;
    setCurrentTime(timeSeconds);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.pause();
    else video.play();
  };

  return (
    <div
      className={`${immersive ? "flex h-full flex-col bg-black" : "surface-card overflow-hidden"} ${className}`}
    >
      <div
        className={`relative bg-black ${immersive ? "min-h-0 flex-1" : "aspect-video"}`}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className={`h-full w-full ${immersive ? "object-cover" : "object-contain"}`}
          playsInline
          loop
          crossOrigin="anonymous"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setVideoError(true)}
          onClick={immersive ? togglePlay : undefined}
        />
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 px-6 text-center">
            <p className="text-sm text-white/60">
              Full video unavailable for this session. Upload again to see
              annotated playback.
            </p>
          </div>
        )}
        <OverlayCanvas
          videoRef={videoRef}
          landmarks={landmarks}
          annotations={annotations}
          confirmedEvents={confirmedEvents}
          useLivePose={false}
          guardCalibration={guardCalibration}
        />
        {immersive ? (
          <div className="absolute left-4 top-4 z-[4] pointer-events-auto">
            <OverlayGuide
              variant="pill"
              sport={sport}
              poseQuality={poseQuality}
              guardCalibrated={guardCalibrated}
            />
          </div>
        ) : null}
        {immersive && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-card bg-white/15 backdrop-blur-md"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
        )}
      </div>

      {!immersive && (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <OverlayGuide
            sport={sport}
            poseQuality={poseQuality}
            guardCalibrated={guardCalibrated}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-white text-black transition-opacity hover:opacity-90"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <TimelineMarkers
              duration={duration}
              currentTime={currentTime}
              moments={moments}
              onSeek={seekTo}
              onScrub={seekTo}
            />
          </div>
        </div>

        <MomentCardList
          moments={moments}
          activeTime={currentTime}
          onSelect={seekTo}
        />
      </div>
      )}
    </div>
  );
}

/** Build annotation props from report findings */
export function buildAnnotationsFromReport(input: {
  positives: PositiveTimestamp[];
  weaknesses: WeaknessTimestamp[];
  confirmedEvents?: ConfirmedPoseEvent[];
  primaryWeaknessType?: string;
}): Annotation[] {
  const weaknessJoint =
    input.confirmedEvents?.[0]?.jointHighlight ??
    (input.primaryWeaknessType
      ? jointForWeakness(input.primaryWeaknessType)
      : "right_wrist");

  return [
    ...input.positives.map((p) => ({
      timestamp: p.timestamp,
      timeSeconds: p.timeSeconds,
      title: p.title,
      type: "positive" as const,
    })),
    ...input.weaknesses.map((w) => {
      const confirmed = input.confirmedEvents?.find(
        (e) => Math.abs(e.timeSeconds - w.timeSeconds) < 2
      );
      return {
        timestamp: w.timestamp,
        timeSeconds: w.timeSeconds,
        title: w.title,
        type: "weakness" as const,
        jointHighlight: confirmed?.jointHighlight ?? weaknessJoint,
      };
    }),
    ...(input.confirmedEvents ?? [])
      .filter(
        (e) =>
          !input.weaknesses.some(
            (w) => Math.abs(w.timeSeconds - e.timeSeconds) < 1
          )
      )
      .map((e) => ({
        timestamp: e.timestamp,
        timeSeconds: e.timeSeconds,
        title: e.label,
        type: "weakness" as const,
        jointHighlight: e.jointHighlight,
      })),
  ];
}

/** Build timestamp arrays from report-style M:SS strings */
export function toPositiveTimestamps(
  items: { timestamp: string; title: string }[]
): PositiveTimestamp[] {
  return items.map((item) => ({
    ...item,
    timeSeconds: parseTimestamp(item.timestamp),
  }));
}

export function toWeaknessTimestamps(
  items: { timestamp: string; title: string }[]
): WeaknessTimestamp[] {
  return items.map((item) => ({
    ...item,
    timeSeconds: parseTimestamp(item.timestamp),
  }));
}
