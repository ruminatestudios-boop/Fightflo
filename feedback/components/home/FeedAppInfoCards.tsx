"use client";

interface FeedAppInfoCardsProps {
  onUpload?: () => void;
  onRecord?: () => void;
  onPricing?: () => void;
}

export function FeedAppInfoCards({ onUpload, onRecord, onPricing }: FeedAppInfoCardsProps) {
  return (
    <section className="feed-action-cards" aria-label="Get started">
      <div className="feed-action-card">
        <div className="feed-action-card-top">
          <div className="feed-action-card-copy">
            <p className="feed-action-card-title">TRAIN SMARTER.</p>
            <p className="feed-action-card-desc">Upload a clip or record live to start.</p>
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
