"use client";

import { FREE_ANALYSIS_LIMIT } from "@/config/limits";

interface FeedAppInfoCardsProps {
  onUpload?: () => void;
  onRecord?: () => void;
  onPricing?: () => void;
  isPro?: boolean;
  completeCount?: number;
  lastSessionDaysAgo?: number | null;
  /** Crew/invite-code scan budget — overrides the free-tier counter when present */
  crewAllowance?: { used: number; limit: number } | null;
}

function returnVisitorMessage(daysAgo: number): string {
  if (daysAgo === 0) return "You trained today — upload your next clip.";
  if (daysAgo === 1) return "Back again — ready to review yesterday's session?";
  if (daysAgo <= 3) return `${daysAgo} days since your last session — time to improve.`;
  if (daysAgo <= 7) return `${daysAgo} days since your last session — don't lose momentum.`;
  return `It's been ${daysAgo} days — your next clip is waiting.`;
}

export function FeedAppInfoCards({
  onUpload,
  onRecord,
  onPricing,
  isPro = false,
  completeCount = 0,
  lastSessionDaysAgo = null,
  crewAllowance = null,
}: FeedAppInfoCardsProps) {
  const isFirstVisit = completeCount === 0;
  const isReturning = completeCount > 0 && lastSessionDaysAgo !== null;
  const remaining = Math.max(0, FREE_ANALYSIS_LIMIT - completeCount);
  const showUsage = !isPro && completeCount > 0 && completeCount < FREE_ANALYSIS_LIMIT;
  const almostOut = !isPro && remaining === 1 && completeCount > 0;

  const crewRemaining = crewAllowance
    ? Math.max(0, crewAllowance.limit - crewAllowance.used)
    : null;
  const crewAlmostOut = crewRemaining !== null && crewRemaining <= 2;

  return (
    <section className="feed-action-cards" aria-label="Get started">
      <div className={`feed-action-card${isFirstVisit ? " feed-action-card--first" : ""}`}>
        <div className="feed-action-card-first-hint">
          <span className="feed-action-card-first-dot" aria-hidden />
          Start here — upload or record your training
        </div>
        <div className="feed-action-card-top">
          <div className="feed-action-card-copy">
            <p className="feed-action-card-title">TRAIN SMARTER.</p>
            {crewRemaining !== null ? (
              <p className={`feed-action-card-usage${crewAlmostOut ? " feed-action-card-usage--warn" : ""}`}>
                <span style={{ color: "#fa4141" }}>{crewRemaining}</span> team scan
                {crewRemaining === 1 ? "" : "s"} left
              </p>
            ) : showUsage ? (
              <p className={`feed-action-card-usage${almostOut ? " feed-action-card-usage--warn" : ""}`}>
                <span style={{ color: "#fa4141" }}>{remaining}</span> free{" "}
                {remaining === 1 ? "analysis" : "analyses"} left
              </p>
            ) : (
              <p className="feed-action-card-desc">Film bag work, pads, or sparring.</p>
            )}
          </div>
          <div className="feed-action-card-btns">
            <button type="button" className="feed-action-card-btn" onClick={onUpload}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 16V4" />
                <path d="M8.5 7.5L12 4l3.5 3.5" />
                <path d="M4 16.5V20a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
              </svg>
              Upload
            </button>
            <button type="button" className="feed-action-card-btn" onClick={onRecord}>
              <span className="feed-action-card-dot" aria-hidden />
              Record
            </button>
          </div>
        </div>
        {crewAllowance === null ? (
          <>
            <div className="feed-action-card-divider" />
            <button type="button" className="feed-action-card-pricing" onClick={onPricing}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Unlock full AI coaching — <span style={{ color: "#fa4141" }}>See Plans</span></span>
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
