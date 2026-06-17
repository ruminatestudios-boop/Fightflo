"use client";

import type { ShadowMoment, ShadowRoundResult } from "@/lib/shadow/types";

interface ShadowRoundSummaryProps {
  result: ShadowRoundResult;
  onAnalyse?: () => void;
  onDone: () => void;
  hasRecording?: boolean;
}

export function ShadowRoundSummary({
  result,
  onAnalyse,
  onDone,
  hasRecording = false,
}: ShadowRoundSummaryProps) {
  const issues = result.moments.filter((m) => m.kind === "issue");
  const positives = result.moments.filter((m) => m.kind === "positive");

  return (
    <div className="shadow-round-summary">
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

      {issues.length > 0 ? (
        <section className="shadow-moment-section">
          <p className="shadow-moment-section-label">Flagged issues</p>
          <ul className="shadow-moment-list">
            {issues.map((moment) => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </ul>
        </section>
      ) : null}

      {positives.length > 0 ? (
        <section className="shadow-moment-section">
          <p className="shadow-moment-section-label">What you did well</p>
          <ul className="shadow-moment-list">
            {positives.map((moment) => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </ul>
        </section>
      ) : null}

      {issues.length === 0 && positives.length === 0 ? (
        <p className="home-flow-empty">
          No moments flagged — try a longer round or film side-on with full body in frame.
        </p>
      ) : null}

      <div className="shadow-round-summary-block">
        <p className="shadow-round-summary-block-label">How to improve</p>
        <p className="shadow-round-summary-block-body">{result.mechanicalFix}</p>
      </div>

      <div className="shadow-round-summary-block">
        <p className="shadow-round-summary-block-label">Drill</p>
        <p className="shadow-round-summary-block-body">{result.drillName}</p>
      </div>

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

function MomentCard({ moment }: { moment: ShadowMoment }) {
  return (
    <li className={`shadow-moment-card shadow-moment-card--${moment.kind}`}>
      <div className="shadow-moment-card-head">
        <span className="shadow-moment-card-time">{moment.timestamp}</span>
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
