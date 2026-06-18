"use client";

import type { ReactNode } from "react";
import { homeCardImage } from "@/lib/home/cardImages";
import { FeedAppInfoCards } from "@/components/home/FeedAppInfoCards";
import { HomeFeatureCarousel } from "@/components/home/HomeFeatureCarousel";
import type { HomeInsights } from "@/lib/insights/types";

export type HomeFeatureId =
  | "upload"
  | "weekly"
  | "reupload"
  | "guard"
  | "shadow"
  | "progress";

/** Set true when weekly focus is ready to ship. */
const SHOW_WEEKLY_FOCUS = false;

interface FeatureBlock {
  id: HomeFeatureId;
  label: string;
  hint: string;
  disabled?: boolean;
  icon: ReactNode;
}

interface HomeFeatureGridProps {
  insights: HomeInsights | null;
  activeId: string;
  onSelect: (id: HomeFeatureId) => void;
  /** `feed` = photo cards + auto carousel (preview at /feed) */
  variant?: "default" | "feed";
  onUpload?: () => void;
  onRecord?: () => void;
  onPricing?: () => void;
  isPro?: boolean;
}

/** Short subheading on each home card — what the tool does, not session stats. */
const FEATURE_HINTS: Record<
  Exclude<HomeFeatureId, "upload">,
  { ready: string; locked: string }
> = {
  guard: {
    ready: "Point your camera at yourself and spar or hit pads. AI watches in real time and beeps every time your hands fall below chin level.",
    locked: "Point your camera at yourself and spar or hit pads. AI watches in real time and beeps every time your hands fall below chin level.",
  },
  shadow: {
    ready: "Hit record and shadowbox for a round. AI tracks your movement, spots sloppy combos, and gives you a breakdown when you finish.",
    locked: "Hit record and shadowbox for a round. AI tracks your movement, spots sloppy combos, and gives you a breakdown when you finish.",
  },
  weekly: {
    ready: "Based on your last session, AI picks the single most important drill to run this week — one fix, not ten.",
    locked: "Upload a clip first. AI will pick the one drill that will improve your technique the most.",
  },
  reupload: {
    ready: "Film the same drill or round you were told to fix. AI compares it to your last session and tells you if the fault is gone.",
    locked: "Upload your first clip so AI has something to compare against next time.",
  },
  progress: {
    ready: "See your guard, footwork, and combo faults charted across every session — so you know if you're actually getting better.",
    locked: "Upload a clip to start building your progress history. Every session adds to the chart.",
  },
};

function featureHint(id: Exclude<HomeFeatureId, "upload">, ready: boolean): string {
  const copy = FEATURE_HINTS[id];
  return ready ? copy.ready : copy.locked;
}

function IconBadge({ onPhoto = false, children }: { onPhoto?: boolean; children: ReactNode }) {
  return (
    <span
      className={`glass-card-icon ${onPhoto ? "glass-card-icon--on-photo" : ""}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

function CardPhoto({
  id,
  variant = "default",
}: {
  id: HomeFeatureId;
  variant?: "default" | "hero";
}) {
  const { src, position } = homeCardImage(id);

  return (
    <span
      className={`home-card-photo ${variant === "hero" ? "home-card-photo--hero" : ""}`}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ objectPosition: position }} loading="lazy" />
      <span
        className={`home-card-photo-overlay ${variant === "hero" ? "home-card-photo-overlay--hero" : ""}`}
      />
    </span>
  );
}

export function HomeFeatureGrid({
  insights,
  activeId,
  onSelect,
  variant = "default",
  onUpload,
  onRecord,
  onPricing,
  isPro = false,
}: HomeFeatureGridProps) {
  const isFeed = variant === "feed";
  const feedUploadUsesPhoto = false;
  const complete = insights?.completeCount ?? 0;
  const hasClip = complete > 0;

  const secondary: FeatureBlock[] = [
    {
      id: "guard",
      label: "AI alerts when your guard drops",
      hint: featureHint("guard", hasClip),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      id: "shadow",
      label: "Record a round, get live feedback",
      hint: featureHint("shadow", true),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    ...(SHOW_WEEKLY_FOCUS
      ? [
          {
            id: "weekly" as const,
            label: "This week's focus",
            hint: featureHint("weekly", hasClip),
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            ),
          },
        ]
      : []),
    {
      id: "reupload",
      label: "See if your last fault improved",
      hint: featureHint("reupload", hasClip),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12.75L11.25 15 15 9.75" />
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "progress",
      label: "Track how your technique improves",
      hint: featureHint("progress", hasClip),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`home-feature-grid ${isFeed ? "home-feature-grid--feed" : ""}`}>
      {!isFeed ? (
        <div
          className={`home-upload-border ${activeId === "upload" ? "home-upload-border--active" : ""}`}
        >
          <button
            type="button"
            className={`glass-card glass-card--hero ${isFeed && feedUploadUsesPhoto ? "glass-card--photo" : ""} home-upload-card ${activeId === "upload" ? "glass-card--active" : ""}`}
            onClick={() => onSelect("upload")}
          >
            {isFeed && feedUploadUsesPhoto ? (
              <CardPhoto id="upload" variant="hero" />
            ) : (
              <span className="home-upload-card-shine" aria-hidden />
            )}
            <div
              className={`home-upload-card-body ${isFeed && feedUploadUsesPhoto ? "home-card-photo-content home-card-photo-content--hero" : ""}`}
            >
              <span className="home-upload-headline">
                Upload a clip — get timestamped coaching
              </span>
              <span className="home-upload-card-cta" aria-hidden>
                <svg
                  className="home-upload-card-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    className="home-upload-card-icon-tray"
                    d="M4 14.5V19a2 2 0 002 2h12a2 2 0 002-2v-4.5"
                  />
                  <path className="home-upload-card-icon-arrow" d="M12 15V5" />
                  <path className="home-upload-card-icon-arrow" d="M8.5 8.5L12 5l3.5 3.5" />
                </svg>
              </span>
              <span className="home-upload-meta">
                Film bag work, pads, or shadowboxing
              </span>
            </div>
          </button>
        </div>
      ) : null}

      <div className="home-feature-grid-secondary">
        {!isFeed ? <p className="home-feature-section-label">Training tools</p> : null}
        {isFeed ? (
          <>
            <HomeFeatureCarousel
              cards={secondary}
              activeId={activeId}
              onSelect={onSelect}
              variant="fullscreen"
            />
            <FeedAppInfoCards
              onUpload={onUpload}
              onRecord={onRecord}
              onPricing={onPricing}
              isPro={isPro}
              completeCount={complete}
              lastSessionDaysAgo={insights?.latestComplete
                ? Math.floor((Date.now() - new Date((insights.latestComplete as { created_at: string }).created_at).getTime()) / 86400000)
                : null}
            />
          </>
        ) : (
          <div className="home-feature-grid-secondary-cards">
            {secondary.map((block) => (
              <button
                key={block.id}
                type="button"
                className={`glass-card ${activeId === block.id ? "glass-card--active" : ""} ${block.disabled ? "glass-card--disabled" : ""}`}
                onClick={() => !block.disabled && onSelect(block.id)}
                disabled={block.disabled}
              >
                <IconBadge>{block.icon}</IconBadge>
                <span className="glass-card-label">{block.label}</span>
                <span className="home-feature-hint">{block.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
