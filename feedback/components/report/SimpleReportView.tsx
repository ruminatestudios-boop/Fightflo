"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { FollowUpComparisonPanel } from "@/components/report/FollowUpComparisonPanel";
import {
  AnnotatedPlayer,
  buildAnnotationsFromReport,
  toPositiveTimestamps,
  toWeaknessTimestamps,
} from "@/components/video/AnnotatedPlayer";
import { PoseQualityBanner } from "@/components/video/PoseQualityBanner";
import { OverlayGuide } from "@/components/video/OverlayGuide";
import { resolvePlaybackUrl } from "@/components/video/utils";
import { getSportConfig } from "@/config/sports";
import type { Report, Session, SportId } from "@/types";

interface SimpleReportViewProps {
  report: Report;
  session: Session;
  onShare?: () => void;
}

export function SimpleReportView({
  report,
  session,
  onShare,
}: SimpleReportViewProps) {
  const sport = report.sport as SportId;
  const sportConfig = getSportConfig(sport);
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

  return (
    <AppShell showLogo showBack>
      <div className="flex flex-col gap-8 pb-10">
        <div>
          <p className="text-center text-xs text-white/40">
            {sportConfig.emoji} {sportConfig.name} · Session {session.session_number}
          </p>
          <p className="mt-4 text-center text-sm leading-relaxed text-white/55">
            {report.coach_summary}
          </p>
        </div>

        {report.follow_up_comparison ? (
          <section className="rounded-[1.25rem] border border-white/10 bg-[#141414] p-5">
            <FollowUpComparisonPanel comparison={report.follow_up_comparison} />
          </section>
        ) : null}

        <AnnotatedPlayer
          videoUrl={videoUrl}
          landmarks={report.raw_landmark_data ?? []}
          annotations={annotations}
          weaknesses={weaknesses}
          positives={positives}
          confirmedEvents={report.confirmed_events ?? []}
          landmarkSummary={report.landmark_summary}
          sport={sport}
          poseQuality={report.pose_quality}
        />

        <PoseQualityBanner quality={report.pose_quality} />
        <OverlayGuide
          sport={sport}
          poseQuality={report.pose_quality}
          guardCalibrated={report.landmark_summary?.guard_calibrated === true}
        />

        <section className="rounded-[1.25rem] border border-white/10 bg-[#141414] p-5">
          <p className="text-xs text-[#fa4141]">
            Main weakness · {report.main_weakness.timestamp}
          </p>
          <h2 className="mt-2 text-lg font-medium capitalize text-white">
            {report.main_weakness.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            {report.main_weakness.what_is_happening}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            {report.main_weakness.mechanical_fix}
          </p>
          <p className="mt-3 text-xs text-white/35">
            {report.main_weakness.frequency}
          </p>
        </section>

        {report.positives.length > 0 && (
          <section>
            <p className="mb-3 text-xs text-white/35">What you did well</p>
            <div className="space-y-2">
              {report.positives.map((p) => (
                <div key={p.timestamp + p.title} className="rounded-[1.25rem] border border-white/10 bg-[#141414] p-4">
                  <p className="text-xs text-emerald-400/80">{p.timestamp}</p>
                  <p className="mt-1 text-sm font-medium text-white">{p.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/45">
                    {p.technical_detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[1.25rem] border border-white/10 bg-[#141414] p-5">
          <p className="text-xs text-[#ff9500]">Next session drill</p>
          <h2 className="mt-2 text-base font-medium text-white">
            {report.drill.name}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {report.drill.description}
          </p>
        </section>

        <section className="px-1">
          <p className="text-sm leading-relaxed text-white/40">
            {report.pattern_insight}
          </p>
        </section>

        {onShare && (
          <button type="button" onClick={onShare} className="flex w-full items-center justify-center rounded-card bg-[#2a2a2a] px-6 py-4 text-[0.9375rem] font-medium text-white active:scale-[0.98]">
            Share analysis
          </button>
        )}
      </div>
    </AppShell>
  );
}
