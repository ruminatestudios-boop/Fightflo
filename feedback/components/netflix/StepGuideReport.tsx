"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalysisSheet } from "@/components/netflix/AnalysisSheet";
import { NetflixShell } from "@/components/netflix/NetflixShell";
import {
  buildAnnotationsFromReport,
  toPositiveTimestamps,
  toWeaknessTimestamps,
} from "@/components/video/AnnotatedPlayer";
import { OverlayCanvas } from "@/components/video/OverlayCanvas";
import { ImmersiveVideoStage } from "@/components/video/ImmersiveVideoStage";
import { TimelineMarkers } from "@/components/video/TimelineMarkers";
import { parseTimestamp, resolvePlaybackUrl, formatTime } from "@/components/video/utils";
import type { TimelineMoment } from "@/components/video/types";
import { getSportConfig } from "@/config/sports";
import type {
  DrillRecommendation,
  MainWeakness,
  PositiveFinding,
  Report,
  Session,
  SportId,
} from "@/types";

interface StepGuideReportProps {
  report: Report;
  session: Session;
  isPro?: boolean;
  onShare?: () => void;
  onUpgrade?: () => void;
}

type StepAccent = "green" | "red" | "orange" | "neutral";

interface ReportStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: StepAccent;
  timestamp?: string;
  seekTime?: number;
  detailType?: "positive" | "weakness" | "drill" | "finish";
  positive?: PositiveFinding;
  weakness?: MainWeakness;
  drill?: DrillRecommendation;
}

function hasSeekTimestamp(timestamp: string): boolean {
  return /^\d/.test(timestamp.trim());
}

function getCardTimestamp(step: ReportStep): {
  label: string;
  seekable: boolean;
  seekTime?: number;
} {
  if (step.seekTime !== undefined) {
    return {
      label: step.timestamp ?? formatTime(step.seekTime),
      seekable: true,
      seekTime: step.seekTime,
    };
  }
  if (step.id === "intro") {
    return { label: "0:00", seekable: true, seekTime: 0 };
  }
  if (step.detailType === "drill") {
    return { label: "Practice", seekable: false };
  }
  if (step.detailType === "finish") {
    return { label: "Full session", seekable: false };
  }
  return { label: "—", seekable: false };
}

const ACCENT_BORDER: Record<StepAccent, string> = {
  green: "stepguide-card--green",
  red: "stepguide-card--red",
  orange: "stepguide-card--orange",
  neutral: "stepguide-card--neutral",
};

export function StepGuideReport({
  report,
  session,
  isPro = false,
  onShare,
  onUpgrade,
}: StepGuideReportProps) {
  const sport = report.sport as SportId;
  const sportConfig = getSportConfig(sport);
  const landmarkTimeline = report.raw_landmark_data ?? [];
  const videoUrl = resolvePlaybackUrl(session);
  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollSyncRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notesVisible, setNotesVisible] = useState(true);

  const handleDownload = useCallback(async () => {
    if (!isPro) {
      onUpgrade?.();
      return;
    }

    const userId =
      session.user_id ??
      (typeof window !== "undefined"
        ? localStorage.getItem("feedback_anon_user_id")
        : null);

    if (!userId) return;

    setDownloading(true);
    try {
      const res = await fetch(
        `/api/video/download?sessionId=${session.id}&userId=${userId}`
      );
      if (res.status === 402) {
        onUpgrade?.();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Download failed"
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-${session.id.slice(0, 8)}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [isPro, onUpgrade, session.id, session.user_id]);

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

  const steps = useMemo((): ReportStep[] => {
    const list: ReportStep[] = [
      {
        id: "intro",
        eyebrow: `${sportConfig.name} · Session ${session.session_number}`,
        title: "Your coach read",
        body: report.coach_summary,
        accent: "neutral",
        timestamp: "0:00",
        seekTime: 0,
      },
    ];

    report.positives.forEach((positive, i) => {
      const canSeek = hasSeekTimestamp(positive.timestamp);
      list.push({
        id: `positive-${i}`,
        eyebrow: "What you did well",
        title: positive.title,
        body: positive.technical_detail,
        accent: "green",
        timestamp: canSeek ? positive.timestamp : undefined,
        seekTime: canSeek ? parseTimestamp(positive.timestamp) : undefined,
        detailType: "positive",
        positive,
      });
    });

    list.push({
      id: "weakness",
      eyebrow: "Main weakness",
      title: report.main_weakness.title,
      body: report.main_weakness.what_is_happening,
      accent: "red",
      timestamp: hasSeekTimestamp(report.main_weakness.timestamp)
        ? report.main_weakness.timestamp
        : undefined,
      seekTime: hasSeekTimestamp(report.main_weakness.timestamp)
        ? parseTimestamp(report.main_weakness.timestamp)
        : undefined,
      detailType: "weakness",
      weakness: report.main_weakness,
    });

    list.push({
      id: "drill",
      eyebrow: "Next session",
      title: report.drill.name,
      body: report.drill.description,
      accent: "orange",
      detailType: "drill",
      drill: report.drill,
    });

    list.push({
      id: "finish",
      eyebrow: "Pattern insight",
      title: "How this fits together",
      body: report.pattern_insight,
      accent: "neutral",
      detailType: "finish",
    });

    return list;
  }, [report, session.session_number, sportConfig.name]);

  const step = steps[stepIndex];
  const isLastStep = stepIndex >= steps.length - 1;

  const seekTo = useCallback((timeSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timeSeconds;
    setCurrentTime(timeSeconds);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.pause();
    else void video.play().catch(() => {});
  }, [playing]);

  const goToStep = useCallback((index: number) => {
    const next = Math.max(0, Math.min(index, steps.length - 1));
    setStepIndex(next);
    scrollSyncRef.current = true;
    cardRefs.current[next]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [steps.length]);

  useEffect(() => {
    if (step.seekTime === undefined) return;
    seekTo(step.seekTime);
    const video = videoRef.current;
    if (video) void video.play().catch(() => {});
  }, [stepIndex, step.seekTime, seekTo]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const onScroll = () => {
      if (scrollSyncRef.current) {
        scrollSyncRef.current = false;
        return;
      }
      const center = el.scrollLeft + el.clientWidth / 2;
      let closest = 0;
      let minDist = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - cardCenter);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      setStepIndex((prev) => (prev === closest ? prev : closest));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [steps.length]);

  const renderSheetContent = () => {
    if (!step.detailType || step.detailType === "finish") {
      return (
        <div className="space-y-4 text-sm leading-relaxed text-white/70">
          <p>{report.coach_summary}</p>
          <p>{report.pattern_insight}</p>
          {onShare && (
            <button type="button" onClick={onShare} className="netflix-cta-primary w-full">
              Share analysis
            </button>
          )}
        </div>
      );
    }

    if (step.detailType === "positive" && step.positive) {
      return (
        <div className="space-y-4 text-sm leading-relaxed text-white/70">
          {step.positive.timestamp && (
            <p>
              <span className="text-white/40">Timestamp · </span>
              {step.positive.timestamp}
            </p>
          )}
          <p>{step.positive.technical_detail}</p>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-wide text-white/35">
              Why it matters
            </p>
            <p className="mt-2">{step.positive.why_it_matters}</p>
          </div>
        </div>
      );
    }

    if (step.detailType === "weakness" && step.weakness) {
      return (
        <div className="space-y-4">
          {[
            { label: "What is happening", value: step.weakness.what_is_happening },
            { label: "Root cause", value: step.weakness.root_cause },
            { label: "Fight consequence", value: step.weakness.fight_consequence },
            { label: "Mechanical fix", value: step.weakness.mechanical_fix },
            { label: "Elite reference", value: step.weakness.elite_reference },
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
            {step.weakness.frequency}
          </p>
        </div>
      );
    }

    if (step.detailType === "drill" && step.drill) {
      return (
        <div className="space-y-4 text-sm text-white/70">
          <p>{step.drill.description}</p>
          <div className="rounded-xl border border-[#ff9500]/20 bg-[#ff9500]/5 p-4">
            <p className="text-[10px] uppercase tracking-wide text-[#ff9500]/70">
              Success marker
            </p>
            <p className="mt-2">{step.drill.success_marker}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <NetflixShell backHref="/" immersive>
      <div className={`stepguide-root stepguide-root--fullscreen ${notesVisible ? "" : "stepguide-root--cinema"}`}>
        <ImmersiveVideoStage
          videoUrl={videoUrl}
          videoRef={videoRef}
          playing={playing}
          videoError={videoError}
          onTimeUpdate={setCurrentTime}
          onDuration={setDuration}
          onPlayState={setPlaying}
          onError={() => setVideoError(true)}
          onTogglePlay={togglePlay}
        >
          <div className="stepguide-video-scrim" aria-hidden />
          <OverlayCanvas
            videoRef={videoRef}
            landmarks={landmarkTimeline}
            annotations={annotations}
            confirmedEvents={report.confirmed_events ?? []}
            useLivePose
          />
        </ImmersiveVideoStage>

        <div className={`stepguide-ui ${notesVisible ? "" : "stepguide-ui--cinema"}`}>
          <div className={`stepguide-rail ${notesVisible ? "" : "stepguide-rail--cinema"}`}>
            <button
              type="button"
              onClick={() => setNotesVisible((v) => !v)}
              className="stepguide-rail-btn"
              aria-label={notesVisible ? "Hide coaching notes" : "Show coaching notes"}
              aria-pressed={!notesVisible}
            >
              {notesVisible ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="stepguide-rail-btn"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className={`stepguide-rail-btn ${isPro ? "" : "stepguide-rail-btn--locked"}`}
              aria-label={isPro ? "Download video" : "Upgrade to download"}
            >
              {downloading ? (
                <span className="text-xs">…</span>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
              )}
            </button>
            {onShare && isLastStep && (
              <button
                type="button"
                onClick={onShare}
                className="stepguide-rail-btn"
                aria-label="Share"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
          </div>

          <div className="stepguide-bottom">
            <div className="stepguide-scrub">
              <TimelineMarkers
                variant="glass"
                duration={duration}
                currentTime={currentTime}
                moments={moments}
                onSeek={seekTo}
                onScrub={seekTo}
              />
            </div>

            <div
              ref={carouselRef}
              className="stepguide-carousel scrollbar-none"
              aria-label="Coaching steps"
            >
              {steps.map((s, i) => {
                const ts = getCardTimestamp(s);

                return (
                <article
                  key={s.id}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className={`stepguide-card ${ACCENT_BORDER[s.accent]} ${i === stepIndex ? "stepguide-card--active" : ""}`}
                  onClick={() => goToStep(i)}
                >
                  <div className="stepguide-card-top">
                    <span className="stepguide-card-step">
                      {i + 1} / {steps.length}
                    </span>
                  </div>
                  {ts.seekable ? (
                    <button
                      type="button"
                      className={`stepguide-card-ts stepguide-card-ts--${s.accent}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToStep(i);
                        if (ts.seekTime !== undefined) {
                          seekTo(ts.seekTime);
                          void videoRef.current?.play().catch(() => {});
                        }
                      }}
                    >
                      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      {ts.label}
                    </button>
                  ) : (
                    <span className={`stepguide-card-ts stepguide-card-ts--${s.accent}`}>
                      {ts.label}
                    </span>
                  )}
                  <p className="stepguide-card-eyebrow">{s.eyebrow}</p>
                  <h2 className="stepguide-card-title">{s.title}</h2>
                  <p className="stepguide-card-body">{s.body}</p>
                  {s.detailType && (
                    <button
                      type="button"
                      className="stepguide-card-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStepIndex(i);
                        setSheetOpen(true);
                      }}
                    >
                      Full breakdown →
                    </button>
                  )}
                </article>
              );
              })}
            </div>
          </div>

          {!notesVisible && (
            <button
              type="button"
              className="stepguide-restore-notes"
              onClick={() => setNotesVisible(true)}
            >
              Show coaching notes
            </button>
          )}
        </div>
      </div>

      <AnalysisSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={step.title}
        subtitle={step.eyebrow}
        accent={step.accent}
      >
        {renderSheetContent()}
      </AnalysisSheet>
    </NetflixShell>
  );
}
