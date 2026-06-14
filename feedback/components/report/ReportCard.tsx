import type { Report, Session, SportId } from "@/types";
import { getSportConfig } from "@/config/sports";
import { VideoReportSection } from "@/components/video/VideoReportSection";
import { PositiveCard } from "./PositiveCard";
import { WeaknessCard } from "./WeaknessCard";
import { DrillCard } from "./DrillCard";
import { ProgressChart } from "./ProgressChart";
import { CoachVoice } from "@/components/shared/CoachVoice";

interface ReportCardProps {
  report: Report;
  session: Session;
  isPro?: boolean;
  progressData?: { session: number; count: number; date: string }[];
  onUpgrade?: () => void;
  onShare?: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ReportCard({
  report,
  session,
  isPro = false,
  progressData = [],
  onUpgrade,
  onShare,
}: ReportCardProps) {
  const sport = report.sport as SportId;
  const sportConfig = getSportConfig(sport);

  return (
    <article className="space-y-8 pb-4">
      <header className="text-center">
        <p className="meta-text">
          {sportConfig.name} · {formatDuration(session.video_duration)} · Session{" "}
          {session.session_number}
        </p>
        <h1 className="text-hero mx-auto mt-4 max-w-[20rem] text-xl text-white">
          {report.coach_summary}
        </h1>
        <p className="mt-3 text-xs capitalize text-[#6b6b6b]">{session.level}</p>
      </header>

      <VideoReportSection report={report} session={session} isPro={isPro} />

      <section>
        <p className="section-kicker">What you did well</p>
        <div className="space-y-3">
          {report.positives.map((positive, i) => (
            <PositiveCard
              key={i}
              positive={positive}
              clipUrl={
                report.clips.find(
                  (c) =>
                    c.timestamp === positive.timestamp &&
                    c.clip_type === "positive"
                )?.clip_url
              }
              isPro={isPro}
              onUpgrade={onUpgrade}
            />
          ))}
        </div>
      </section>

      <section>
        <p className="section-kicker text-[#ff9500]/80">Main weakness</p>
        <WeaknessCard
          weakness={report.main_weakness}
          clipUrl={
            report.clips.find((c) => c.clip_type === "weakness")?.clip_url
          }
          isPro={isPro}
          onUpgrade={onUpgrade}
        />
      </section>

      <section className="surface-card p-5">
        <p className="section-kicker mb-3">Pattern insight</p>
        <p className="text-sm leading-relaxed text-white/55">
          {report.pattern_insight}
        </p>
      </section>

      <section>
        <p className="section-kicker text-[#ff9500]/80">Drill for next session</p>
        <DrillCard drill={report.drill} />
      </section>

      {session.session_number >= 2 && progressData.length > 1 && (
        <section>
          <p className="section-kicker">Progress</p>
          <ProgressChart
            data={progressData}
            weaknessTitle={report.main_weakness.title}
          />
        </section>
      )}

      <section>
        <p className="section-kicker">Coach summary</p>
        <CoachVoice summary={report.coach_summary} sport={sport} />
      </section>

      {onShare && (
        <button type="button" onClick={onShare} className="pill-btn pill-btn-primary">
          Share your analysis
        </button>
      )}
    </article>
  );
}
