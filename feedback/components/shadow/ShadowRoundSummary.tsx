"use client";

import { useMemo, useState } from "react";
import type { ShadowMoment, ShadowRoundResult } from "@/lib/shadow/types";

interface ShadowRoundSummaryProps {
  result: ShadowRoundResult;
  onAnalyse?: () => void;
  onDone: () => void;
  hasRecording?: boolean;
}

interface ConsolidatedMoment {
  eventType: string;
  kind: "issue" | "positive";
  title: string;
  detail: string;
  fix: string;
  joint: ShadowMoment["joint"];
  count: number;
  firstTimestamp: string;
}

function consolidateMoments(moments: ShadowMoment[]): ConsolidatedMoment[] {
  const byType = new Map<string, ConsolidatedMoment>();

  for (const moment of moments) {
    const existing = byType.get(moment.eventType);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byType.set(moment.eventType, {
      eventType: moment.eventType,
      kind: moment.kind,
      title: moment.title,
      detail: moment.detail,
      fix: moment.fix,
      joint: moment.joint,
      count: 1,
      firstTimestamp: moment.timestamp,
    });
  }

  return Array.from(byType.values()).sort((a, b) => b.count - a.count);
}

type SummaryTab = "summary" | "issues" | "good" | "improve";

export function ShadowRoundSummary({
  result,
  onAnalyse,
  onDone,
  hasRecording = false,
}: ShadowRoundSummaryProps) {
  const issues = useMemo(
    () => consolidateMoments(result.moments.filter((m) => m.kind === "issue")),
    [result.moments]
  );
  const positives = useMemo(
    () => consolidateMoments(result.moments.filter((m) => m.kind === "positive")),
    [result.moments]
  );

  const [tab, setTab] = useState<SummaryTab>("summary");
  const [showFullReport, setShowFullReport] = useState(false);

  const topIssue = issues[0];
  const topPositive = positives[0];

  // Elbow/hip/etc checks only mean something relative to an actual punch —
  // with too few thrown, flagged "issues" are more likely camera noise than
  // real technique problems. Say that plainly rather than presenting noise
  // as a confident "biggest issue."
  const punchCount = result.punches?.length ?? 0;
  const lowActivity = punchCount < 2;

  return (
    <div className="shadow-round-summary">
      <button
        type="button"
        className="shadow-round-summary-back"
        onClick={onDone}
        aria-label="Back"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <p className="shadow-round-summary-kicker">Round complete</p>
      <h2 className="shadow-round-summary-title">Shadowboxing breakdown</h2>

      <p className="shadow-round-summary-counts">
        <span className="shadow-round-summary-count shadow-round-summary-count--issue">
          {result.issueCount} issue{result.issueCount === 1 ? "" : "s"}
        </span>
        <span className="shadow-round-summary-count shadow-round-summary-count--positive">
          {result.positiveCount} good moment{result.positiveCount === 1 ? "" : "s"}
        </span>
      </p>

      <p className="shadow-round-summary-body">{result.summary}</p>

      {result.topCombos && result.topCombos.length > 0 ? (
        <p className="shadow-round-summary-combos">
          Thrown most: {result.topCombos.join(" · ")}
        </p>
      ) : null}

      <div className="shadow-round-summary-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "summary"}
          className={`shadow-round-summary-tab${tab === "summary" ? " shadow-round-summary-tab--active" : ""}`}
          onClick={() => setTab("summary")}
        >
          Summary
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "issues"}
          className={`shadow-round-summary-tab${tab === "issues" ? " shadow-round-summary-tab--active" : ""}`}
          onClick={() => setTab("issues")}
        >
          Issues ({issues.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "good"}
          className={`shadow-round-summary-tab${tab === "good" ? " shadow-round-summary-tab--active" : ""}`}
          onClick={() => setTab("good")}
        >
          Good ({positives.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "improve"}
          className={`shadow-round-summary-tab${tab === "improve" ? " shadow-round-summary-tab--active" : ""}`}
          onClick={() => setTab("improve")}
        >
          Improve
        </button>
      </div>

      {tab === "summary" ? (
        <div className="shadow-round-summary-synopsis">
          {lowActivity ? (
            <div className="shadow-round-summary-synopsis-row">
              <p className="shadow-round-summary-synopsis-label">Not enough data</p>
              <p className="shadow-round-summary-synopsis-detail">
                Not enough punching activity detected this round to give specific feedback —
                throw more combos next round.
              </p>
            </div>
          ) : topIssue ? (
            <div className="shadow-round-summary-synopsis-row shadow-round-summary-synopsis-row--issue">
              <p className="shadow-round-summary-synopsis-label">Biggest issue</p>
              <p className="shadow-round-summary-synopsis-title">
                {topIssue.title}
                {topIssue.count > 1 ? ` (×${topIssue.count})` : ""}
              </p>
              <p className="shadow-round-summary-synopsis-detail">{topIssue.detail}</p>
            </div>
          ) : (
            <div className="shadow-round-summary-synopsis-row shadow-round-summary-synopsis-row--issue">
              <p className="shadow-round-summary-synopsis-label">Biggest issue</p>
              <p className="shadow-round-summary-synopsis-detail">No issues flagged this round.</p>
            </div>
          )}

          {lowActivity ? null : topPositive ? (
            <div className="shadow-round-summary-synopsis-row shadow-round-summary-synopsis-row--positive">
              <p className="shadow-round-summary-synopsis-label">Best moment</p>
              <p className="shadow-round-summary-synopsis-title">
                {topPositive.title}
                {topPositive.count > 1 ? ` (×${topPositive.count})` : ""}
              </p>
              <p className="shadow-round-summary-synopsis-detail">{topPositive.detail}</p>
            </div>
          ) : (
            <div className="shadow-round-summary-synopsis-row shadow-round-summary-synopsis-row--positive">
              <p className="shadow-round-summary-synopsis-label">Best moment</p>
              <p className="shadow-round-summary-synopsis-detail">No good moments flagged this round.</p>
            </div>
          )}

          <div className="shadow-round-summary-synopsis-row">
            <p className="shadow-round-summary-synopsis-label">Focus next round</p>
            <p className="shadow-round-summary-synopsis-detail">{result.mechanicalFix}</p>
          </div>
        </div>
      ) : null}

      {tab === "issues" ? (
        issues.length > 0 ? (
          <ul className="shadow-moment-list">
            {issues.map((moment) => (
              <ConsolidatedMomentCard key={moment.eventType} moment={moment} />
            ))}
          </ul>
        ) : (
          <p className="home-flow-empty">No issues flagged this round.</p>
        )
      ) : null}

      {tab === "good" ? (
        positives.length > 0 ? (
          <ul className="shadow-moment-list">
            {positives.map((moment) => (
              <ConsolidatedMomentCard key={moment.eventType} moment={moment} />
            ))}
          </ul>
        ) : (
          <p className="home-flow-empty">No good moments flagged this round.</p>
        )
      ) : null}

      {tab === "improve" ? (
        <>
          {result.recommendMore && result.recommendMore.length > 0 ? (
            <section className="shadow-moment-section">
              <p className="shadow-moment-section-label">Combos to do more of</p>
              <ul className="shadow-moment-list">
                {result.recommendMore.map((rec) => (
                  <li key={rec.combo} className="shadow-moment-card shadow-moment-card--combo">
                    <p className="shadow-moment-card-title">{rec.label}</p>
                    <p className="shadow-moment-card-detail">{rec.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="shadow-round-summary-block">
            <p className="shadow-round-summary-block-label">How to improve</p>
            <p className="shadow-round-summary-block-body">{result.mechanicalFix}</p>
          </div>

          <div className="shadow-round-summary-block">
            <p className="shadow-round-summary-block-label">Drill</p>
            <p className="shadow-round-summary-block-body">{result.drillName}</p>
          </div>
        </>
      ) : null}

      <div className="shadow-round-summary-actions">
        {hasRecording && onAnalyse ? (
          <button type="button" className="ff-primary-btn" onClick={onAnalyse}>
            Analyse full clip
          </button>
        ) : null}
        <button
          type="button"
          className="home-flow-action home-flow-action--secondary shadow-round-summary-done"
          onClick={onDone}
        >
          Done
        </button>
        <button
          type="button"
          className="shadow-round-summary-full-report-toggle"
          onClick={() => setShowFullReport((v) => !v)}
          aria-expanded={showFullReport}
        >
          {showFullReport ? "Hide full report" : "Full report"}
        </button>
      </div>

      {showFullReport ? (
        <div className="shadow-round-summary-full-report">
          <p className="shadow-round-summary-body">{result.summary}</p>

          <section className="shadow-moment-section">
            <p className="shadow-moment-section-label">
              All issues ({issues.length})
            </p>
            {issues.length > 0 ? (
              <ul className="shadow-moment-list">
                {issues.map((moment) => (
                  <ConsolidatedMomentCard key={moment.eventType} moment={moment} />
                ))}
              </ul>
            ) : (
              <p className="home-flow-empty">No issues flagged this round.</p>
            )}
          </section>

          <section className="shadow-moment-section">
            <p className="shadow-moment-section-label">
              All good moments ({positives.length})
            </p>
            {positives.length > 0 ? (
              <ul className="shadow-moment-list">
                {positives.map((moment) => (
                  <ConsolidatedMomentCard key={moment.eventType} moment={moment} />
                ))}
              </ul>
            ) : (
              <p className="home-flow-empty">No good moments flagged this round.</p>
            )}
          </section>

          {result.recommendMore && result.recommendMore.length > 0 ? (
            <section className="shadow-moment-section">
              <p className="shadow-moment-section-label">Combos to do more of</p>
              <ul className="shadow-moment-list">
                {result.recommendMore.map((rec) => (
                  <li key={rec.combo} className="shadow-moment-card shadow-moment-card--combo">
                    <p className="shadow-moment-card-title">{rec.label}</p>
                    <p className="shadow-moment-card-detail">{rec.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="shadow-round-summary-block">
            <p className="shadow-round-summary-block-label">How to improve</p>
            <p className="shadow-round-summary-block-body">{result.mechanicalFix}</p>
          </div>

          <div className="shadow-round-summary-block">
            <p className="shadow-round-summary-block-label">Drill</p>
            <p className="shadow-round-summary-block-body">{result.drillName}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConsolidatedMomentCard({ moment }: { moment: ConsolidatedMoment }) {
  return (
    <li className={`shadow-moment-card shadow-moment-card--${moment.kind}`}>
      <div className="shadow-moment-card-head">
        <span className="shadow-moment-card-time">
          {moment.count > 1 ? `×${moment.count}` : moment.firstTimestamp}
        </span>
        <span className="shadow-moment-card-joint">{formatJoint(moment.joint)}</span>
      </div>
      <p className="shadow-moment-card-title">{moment.title}</p>
      <p className="shadow-moment-card-detail">{moment.detail}</p>
      <p className="shadow-moment-card-fix">{moment.fix}</p>
    </li>
  );
}

function formatJoint(joint: ShadowMoment["joint"]): string {
  return joint.replace(/_/g, " ");
}
