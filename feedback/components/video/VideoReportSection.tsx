"use client";

import { useMemo } from "react";
import type { Report, Session } from "@/types";
import {
  AnnotatedPlayer,
  buildAnnotationsFromReport,
  toPositiveTimestamps,
  toWeaknessTimestamps,
} from "./AnnotatedPlayer";
import { SlowMotionClip } from "./SlowMotionClip";
import { PoseQualityBanner } from "./PoseQualityBanner";
import { OverlayGuide } from "./OverlayGuide";
import { landmarksNearTime, parseTimestamp, resolvePlaybackUrl } from "./utils";
import type { SportId } from "@/types";

interface VideoReportSectionProps {
  report: Report;
  session: Session;
  isPro?: boolean;
}

export function VideoReportSection({
  report,
  session,
  isPro = false,
}: VideoReportSectionProps) {
  const landmarks = useMemo(
    () => report.raw_landmark_data ?? [],
    [report.raw_landmark_data]
  );
  const videoUrl = resolvePlaybackUrl(session);

  const positives = useMemo(
    () => toPositiveTimestamps(report.positives),
    [report.positives]
  );

  const weaknesses = useMemo(
    () =>
      toWeaknessTimestamps([
        {
          timestamp: report.main_weakness.timestamp,
          title: report.main_weakness.title,
        },
      ]),
    [report.main_weakness]
  );

  const annotations = useMemo(
    () =>
      buildAnnotationsFromReport({
        positives,
        weaknesses,
        confirmedEvents: report.confirmed_events,
        primaryWeaknessType: report.confirmed_events?.[0]?.weakness_type,
      }),
    [positives, weaknesses, report.confirmed_events]
  );

  const weaknessClipUrl = report.clips.find((c) => c.clip_type === "weakness")
    ?.clip_url;

  const weaknessTime = parseTimestamp(report.main_weakness.timestamp);
  const clipStartOffset = Math.max(0, weaknessTime - 1);

  const weaknessLandmarks = useMemo(
    () => landmarksNearTime(landmarks, weaknessTime, 2),
    [landmarks, weaknessTime]
  );
  const sport = report.sport as SportId;

  return (
    <section className="space-y-4">
      <p className="section-kicker">Annotated footage</p>
      <PoseQualityBanner quality={report.pose_quality} />
      <OverlayGuide
        sport={sport}
        poseQuality={report.pose_quality}
        guardCalibrated={report.landmark_summary?.guard_calibrated === true}
      />
      <AnnotatedPlayer
        videoUrl={videoUrl}
        landmarks={landmarks}
        annotations={annotations}
        weaknesses={weaknesses}
        positives={positives}
        confirmedEvents={report.confirmed_events ?? []}
        landmarkSummary={report.landmark_summary}
        sport={sport}
        poseQuality={report.pose_quality}
      />

      <SlowMotionClip
        clipUrl={weaknessClipUrl || undefined}
        timestamp={report.main_weakness.timestamp}
        title={report.main_weakness.title}
        landmarks={weaknessLandmarks}
        landmarkTimeOffset={clipStartOffset}
        confirmedEvents={report.confirmed_events ?? []}
        landmarkSummary={report.landmark_summary}
        measurements={
          isPro
            ? [
                {
                  label: "Frequency",
                  value: report.main_weakness.frequency,
                },
                {
                  label: "Fix cue",
                  value: report.main_weakness.mechanical_fix.slice(0, 48),
                },
              ]
            : []
        }
      />
    </section>
  );
}
