"use client";

import type { ReactNode } from "react";
import type { HomeInsights } from "@/lib/insights/types";

export type HomeFeatureId =
  | "upload"
  | "weekly"
  | "reupload"
  | "guard"
  | "shadow"
  | "progress";

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
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="glass-card-icon" aria-hidden>
      {children}
    </span>
  );
}

export function HomeFeatureGrid({
  insights,
  activeId,
  onSelect,
}: HomeFeatureGridProps) {
  const complete = insights?.completeCount ?? 0;

  const secondary: FeatureBlock[] = [
    {
      id: "guard",
      label: "Track your guard",
      hint:
        complete > 0
          ? insights?.guard?.dropCount
            ? `${insights.guard.dropCount} drop${insights.guard.dropCount === 1 ? "" : "s"} flagged`
            : "Red flags when hands drop"
          : "Needs 1 analysed clip",
      disabled: complete === 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      id: "shadow",
      label: "Shadow round",
      hint: "Live issues & good moments",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      id: "weekly",
      label: "This week's focus",
      hint: complete > 0 ? insights?.weeklyFocus?.drillName ?? "Your drill" : "Needs 1 analysed clip",
      disabled: complete === 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      id: "reupload",
      label: "Verify your fix",
      hint:
        complete > 0
          ? "Re-upload after drilling"
          : "Needs 1 analysed clip",
      disabled: complete === 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12.75L11.25 15 15 9.75" />
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "progress",
      label: "Your progress",
      hint: complete > 0 ? "Session metrics" : "Needs 1 analysed clip",
      disabled: complete === 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="home-feature-grid">
      <div
        className={`home-upload-border ${activeId === "upload" ? "home-upload-border--active" : ""}`}
      >
        <button
          type="button"
          className={`glass-card glass-card--hero home-upload-card ${activeId === "upload" ? "glass-card--active" : ""}`}
          onClick={() => onSelect("upload")}
        >
          <span className="home-upload-kicker">Get started</span>

          <div className="home-upload-card-body">
            <span className="home-upload-headline">
              Upload a clip — get timestamped coaching
            </span>

            <span className="home-upload-icon-btn" aria-hidden>
              <span className="home-upload-icon-glow" aria-hidden />
              <svg className="home-upload-hero-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <g className="home-upload-hero-arrow">
                  <path d="M12 15V3" />
                  <path d="M8 7l4-4 4 4" />
                </g>
                <path className="home-upload-hero-tray" d="M4 21h16" />
              </svg>
            </span>
          </div>

          <span className="home-upload-footnote">
            Film bag work, pads, or shadowboxing — tap to upload
          </span>
        </button>
      </div>

      <div className="home-feature-grid-secondary">
        <p className="home-feature-section-label">Training tools</p>
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
      </div>
    </div>
  );
}
