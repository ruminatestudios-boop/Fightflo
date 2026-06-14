"use client";

import type { ReactNode } from "react";
import type { HomeInsights } from "@/lib/insights/types";

export type HomeFeatureId =
  | "upload"
  | "reupload"
  | "progress"
  | "compare"
  | "weekly"
  | "coach-share";

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
      id: "reupload",
      label: "Verify your fix",
      hint:
        complete > 0
          ? "Re-upload after drilling"
          : "Needs 1 analysed clip",
      disabled: complete === 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: "progress",
      label: "Your progress",
      hint: complete > 0 ? "Faults over time" : "Needs 1 analysed clip",
      disabled: complete === 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "compare",
      label: "Compare clips",
      hint: complete >= 2 ? "Latest vs previous" : "Needs 2 analysed clips",
      disabled: complete < 2,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
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
      id: "coach-share",
      label: "Share with coach",
      hint: complete > 0 ? "Send report link" : "Needs 1 analysed clip",
      disabled: complete === 0,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684L12 7.632l-1.367-.684a3 3 0 00-5.367 2.684l6.632 3.316z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="home-feature-grid">
      <button
        type="button"
        className={`glass-card glass-card--hero ${activeId === "upload" ? "glass-card--active" : ""}`}
        onClick={() => onSelect("upload")}
      >
        <IconBadge>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </IconBadge>
        <span className="glass-card-label glass-card-label--hero">
          Upload a clip and get timestamped coaching
        </span>
      </button>

      <div className="home-feature-grid-secondary">
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
  );
}
