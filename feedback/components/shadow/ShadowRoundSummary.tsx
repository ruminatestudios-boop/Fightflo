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

type SummaryTab = "issues" | "good" | "improve";

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

  const [tab, setTab] = useState<SummaryTab>(issues.length > 0 ? "issues" : "good");

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
      </div>
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
