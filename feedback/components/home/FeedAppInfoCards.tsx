"use client";

interface FeedAppInfoCardsProps {
  onUpload?: () => void;
  onRecord?: () => void;
}

export function FeedAppInfoCards({ onUpload, onRecord }: FeedAppInfoCardsProps) {
  return (
    <section className="feed-spotlight" aria-label="Get started">
      <article className="feed-spotlight-card">
        <div className="feed-spotlight-actions feed-spotlight-actions--solo">
          <button type="button" className="feed-spotlight-btn feed-spotlight-btn--primary" onClick={onUpload}>
            <span className="feed-spotlight-btn-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" />
                <path d="M8.5 7.5L12 4l3.5 3.5" />
                <path d="M4 16.5V20a2 2 0 002 2h12a2 2 0 002-2v-3.5" />
              </svg>
            </span>
            Upload a clip
          </button>
          <button type="button" className="feed-spotlight-btn feed-spotlight-btn--secondary" onClick={onRecord}>
            <span className="feed-spotlight-btn-icon" aria-hidden>
              <span className="feed-spotlight-record-dot" />
            </span>
            Live record
          </button>
        </div>

        <div className="feed-spotlight-footer">
          <svg className="feed-spotlight-footer-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Know exactly what to fix next</span>
        </div>
      </article>
    </section>
  );
}
