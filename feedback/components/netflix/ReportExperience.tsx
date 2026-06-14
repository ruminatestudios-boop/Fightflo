"use client";

import { useCallback, useMemo, useState } from "react";
import { getSportConfig } from "@/config/sports";
import { AnalysisSheet } from "@/components/netflix/AnalysisSheet";
import { NetflixCarousel, type NetflixSlide } from "@/components/netflix/NetflixCarousel";
import { NetflixShell } from "@/components/netflix/NetflixShell";
import {
  AnnotatedPlayer,
  buildAnnotationsFromReport,
  toPositiveTimestamps,
  toWeaknessTimestamps,
} from "@/components/video/AnnotatedPlayer";
import { PoseQualityBanner } from "@/components/video/PoseQualityBanner";
import { resolvePlaybackUrl } from "@/components/video/utils";
import type { MainWeakness, PositiveFinding, Report, Session, SportId } from "@/types";

interface ReportExperienceProps {
  report: Report;
  session: Session;
  isPro?: boolean;
  onShare?: () => void;
  onUpgrade?: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type ModalState =
  | { type: "none" }
  | { type: "positive"; data: PositiveFinding }
  | { type: "weakness"; data: MainWeakness }
  | { type: "drill" }
  | { type: "insight" };

export function ReportExperience({
  report,
  session,
  isPro = false,
  onShare,
  onUpgrade,
}: ReportExperienceProps) {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
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

  const closeModal = useCallback(() => setModal({ type: "none" }), []);

  const slides: NetflixSlide[] = useMemo(() => {
    const list: NetflixSlide[] = [
      {
        id: "hero",
        content: (
          <div className="netflix-slide-inner netflix-gradient-hero">
            <div className="netflix-slide-content justify-end pb-28">
              <p className="netflix-eyebrow">
                {sportConfig.emoji} {sportConfig.name}
              </p>
              <h1 className="netflix-display mt-3 max-w-[16rem]">
                Session {session.session_number}
              </h1>
              <p className="netflix-body mt-6 max-w-[18rem] text-white/70">
                {report.coach_summary}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="netflix-tag">{session.level}</span>
                <span className="netflix-tag">
                  {formatDuration(session.video_duration)}
                </span>
                {report.pose_quality && (
                  <span className="netflix-tag">
                    Pose {report.pose_quality.score}%
                  </span>
                )}
              </div>
              <p className="mt-8 text-xs text-white/35">Swipe for breakdown →</p>
            </div>
          </div>
        ),
      },
      {
        id: "footage",
        content: (
          <div className="netflix-slide-inner flex flex-col bg-black">
            <div className="min-h-0 flex-1">
              <AnnotatedPlayer
                videoUrl={videoUrl}
                landmarks={report.raw_landmark_data ?? []}
                annotations={annotations}
                weaknesses={weaknesses}
                positives={positives}
                confirmedEvents={report.confirmed_events ?? []}
                immersive
                className="h-full"
              />
            </div>
            <div className="netflix-slide-footer shrink-0">
              <p className="netflix-eyebrow text-[#fa4141]">Annotated footage</p>
              <h2 className="netflix-title mt-1">AI overlay on your video</h2>
              <div className="mt-2">
                <PoseQualityBanner quality={report.pose_quality} />
              </div>
            </div>
          </div>
        ),
      },
    ];

    report.positives.forEach((positive, i) => {
      list.push({
        id: `positive-${i}`,
        content: (
          <div className="netflix-slide-inner netflix-gradient-good">
            <div className="netflix-slide-content justify-end pb-28">
              <p className="netflix-eyebrow text-emerald-400">What you did well</p>
              <p className="mt-2 font-mono text-sm text-emerald-400/80">
                {positive.timestamp}
              </p>
              <h2 className="netflix-display mt-4 max-w-[15rem] capitalize">
                {positive.title}
              </h2>
              <p className="netflix-body mt-4 line-clamp-4 max-w-[18rem] text-white/60">
                {positive.technical_detail}
              </p>
              <button
                type="button"
                onClick={() => setModal({ type: "positive", data: positive })}
                className="netflix-cta mt-8"
              >
                Full analysis
              </button>
            </div>
          </div>
        ),
      });
    });

    list.push(
      {
        id: "weakness",
        content: (
          <div className="netflix-slide-inner netflix-gradient-warn">
            <div className="netflix-slide-content justify-end pb-28">
              <p className="netflix-eyebrow text-[#fa4141]">Main weakness</p>
              <p className="mt-2 font-mono text-sm text-[#fa4141]/80">
                {report.main_weakness.timestamp}
              </p>
              <h2 className="netflix-display mt-4 max-w-[15rem] capitalize">
                {report.main_weakness.title}
              </h2>
              <p className="netflix-body mt-4 line-clamp-3 max-w-[18rem] text-white/55">
                {report.main_weakness.what_is_happening}
              </p>
              <p className="mt-3 font-mono text-xs text-white/40">
                {report.main_weakness.frequency}
              </p>
              <button
                type="button"
                onClick={() =>
                  setModal({ type: "weakness", data: report.main_weakness })
                }
                className="netflix-cta netflix-cta-danger mt-8"
              >
                Deep breakdown
              </button>
            </div>
          </div>
        ),
      },
      {
        id: "drill",
        content: (
          <div className="netflix-slide-inner netflix-gradient-drill">
            <div className="netflix-slide-content justify-end pb-28">
              <p className="netflix-eyebrow text-[#ff9500]">Next session</p>
              <h2 className="netflix-display mt-4 max-w-[14rem]">
                {report.drill.name}
              </h2>
              <p className="netflix-body mt-4 line-clamp-4 max-w-[18rem] text-white/55">
                {report.drill.description}
              </p>
              <button
                type="button"
                onClick={() => setModal({ type: "drill" })}
                className="netflix-cta mt-8"
              >
                View drill plan
              </button>
            </div>
          </div>
        ),
      },
      {
        id: "finish",
        content: (
          <div className="netflix-slide-inner netflix-gradient-finish">
            <div className="netflix-slide-content justify-center pb-28 text-center">
              <p className="netflix-eyebrow">Pattern insight</p>
              <p className="netflix-body mx-auto mt-4 max-w-[16rem] text-white/65">
                {report.pattern_insight}
              </p>
              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="netflix-cta-primary mx-auto mt-10"
                >
                  Share analysis
                </button>
              )}
              <button
                type="button"
                onClick={() => setModal({ type: "insight" })}
                className="mt-4 text-sm text-white/40 underline-offset-2 hover:text-white/60 hover:underline"
              >
                Read coach notes
              </button>
            </div>
          </div>
        ),
      }
    );

    return list;
  }, [
    report,
    session,
    sportConfig,
    videoUrl,
    annotations,
    weaknesses,
    positives,
    onShare,
  ]);

  return (
    <NetflixShell backHref="/">
      <NetflixCarousel slides={slides} />

      <AnalysisSheet
        open={modal.type === "positive"}
        onClose={closeModal}
        title={modal.type === "positive" ? modal.data.title : ""}
        subtitle="What you did well"
        accent="green"
      >
        {modal.type === "positive" && (
          <div className="space-y-4 text-sm leading-relaxed text-white/70">
            <p>
              <span className="text-white/40">Timestamp · </span>
              {modal.data.timestamp}
            </p>
            <p>{modal.data.technical_detail}</p>
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-wide text-white/35">
                Why it matters
              </p>
              <p className="mt-2">{modal.data.why_it_matters}</p>
            </div>
            {!isPro && onUpgrade && (
              <button type="button" onClick={onUpgrade} className="netflix-cta w-full">
                Pro — unlock clip replay
              </button>
            )}
          </div>
        )}
      </AnalysisSheet>

      <AnalysisSheet
        open={modal.type === "weakness"}
        onClose={closeModal}
        title={modal.type === "weakness" ? modal.data.title : ""}
        subtitle="Main weakness"
        accent="red"
      >
        {modal.type === "weakness" && (
          <div className="space-y-4">
            {[
              { label: "What is happening", value: modal.data.what_is_happening },
              { label: "Root cause", value: modal.data.root_cause },
              { label: "Fight consequence", value: modal.data.fight_consequence },
              { label: "Mechanical fix", value: modal.data.mechanical_fix },
              { label: "Elite reference", value: modal.data.elite_reference },
            ].map((field) => (
              <div key={field.label} className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                  {field.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {field.value}
                </p>
              </div>
            ))}
            <p className="font-mono text-xs text-[#fa4141]/80">
              {modal.data.frequency}
            </p>
          </div>
        )}
      </AnalysisSheet>

      <AnalysisSheet
        open={modal.type === "drill"}
        onClose={closeModal}
        title={report.drill.name}
        subtitle="Drill for next session"
        accent="orange"
      >
        <div className="space-y-4 text-sm text-white/70">
          <p>{report.drill.description}</p>
          <div className="rounded-xl border border-[#ff9500]/20 bg-[#ff9500]/5 p-4">
            <p className="text-[10px] uppercase tracking-wide text-[#ff9500]/70">
              Success marker
            </p>
            <p className="mt-2">{report.drill.success_marker}</p>
          </div>
        </div>
      </AnalysisSheet>

      <AnalysisSheet
        open={modal.type === "insight"}
        onClose={closeModal}
        title="Coach summary"
        subtitle="Full picture"
        accent="neutral"
      >
        <p className="text-sm leading-relaxed text-white/70">
          {report.coach_summary}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/50">
          {report.pattern_insight}
        </p>
      </AnalysisSheet>
    </NetflixShell>
  );
}
