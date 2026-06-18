"use client";

import { FREE_ANALYSIS_LIMIT } from "@/config/limits";

interface FeedAppInfoCardsProps {
  onUpload?: () => void;
  onRecord?: () => void;
  onPricing?: () => void;
  isPro?: boolean;
  completeCount?: number;
  lastSessionDaysAgo?: number | null;
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
}: FeedAppInfoCardsProps) {
  const isFirstVisit = completeCount === 0;
  const isReturning = completeCount > 0 && lastSessionDaysAgo !== null;
  const remaining = Math.max(0, FREE_ANALYSIS_LIMIT - completeCount);
  const showUsage = !isPro && completeCount > 0 && completeCount < FREE_ANALYSIS_LIMIT;
  const almostOut = !isPro && remaining === 1 && completeCount > 0;

  return (
    <section className="feed-action-cards" aria-label="Get started">
      <div className={`feed-action-card${isFirstVisit ? " feed-action-card--first" : ""}`}>
        {isFirstVisit && (
          <div className="feed-action-card-first-hint">
            <span className="feed-action-card-first-dot" aria-hidden />
            Start here — upload or record your training
          </div>
        )}
        {isReturning && lastSessionDaysAgo !== null && (
          <div className="feed-action-card-returning">
            {returnVisitorMessage(lastSessionDaysAgo)}
          </div>
        )}
        <div className="feed-action-card-top">
          <div className="feed-action-card-copy">
            <p className="feed-action-card-title">TRAIN SMARTER.</p>
            {showUsage ? (
              <p className={`feed-action-card-usage${almostOut ? " feed-action-card-usage--warn" : ""}`}>
                {remaining} free {remaining === 1 ? "analysis" : "analyses"} left
              </p>
            ) : (
              <p className="feed-action-card-desc">Upload a clip or record live to start.</p>
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
        <div className="feed-action-card-divider" />
        <button type="button" className="feed-action-card-pricing" onClick={onPricing}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Unlock full AI coaching — see plans</span>
        </button>
      </div>
    </section>
  );
}
