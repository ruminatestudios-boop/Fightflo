"use client";

import type { ReactNode } from "react";
import { SegmentedProgressBar } from "@/components/shared/SegmentedProgressBar";

interface InsightMetricProps {
  value: string | number;
  suffix?: string;
  label: string;
  progress?: number;
  progressHint?: string;
}

interface InsightCardProps {
  kicker: string;
  title: string;
  accentKicker?: boolean;
  variant?: "default" | "guard" | "accent";
  metric?: InsightMetricProps;
  summary?: string;
  highlight?: string;
  highlightLabel?: string;
  fix?: string;
  fixLabel?: string;
  drill?: string;
  marker?: string;
  markerLabel?: string;
  footer?: ReactNode;
}

export function InsightCard({
  kicker,
  title,
  accentKicker = false,
  variant = "default",
  metric,
  summary,
  highlight,
  highlightLabel,
  fix,
  fixLabel = "How to improve",
  drill,
  marker,
  markerLabel = "Success marker",
  footer,
}: InsightCardProps) {
  return (
    <div
      className={`insight-card glass-surface-card insight-card--${variant} ${
        accentKicker ? "insight-card--accent-kicker" : ""
      }`}
    >
      <p className={`insight-card-kicker ${accentKicker ? "loading-panel-kicker" : "glass-greeting-sub"}`}>
        {kicker}
      </p>
      <h2 className="glass-greeting-title insight-card-title">{title}</h2>

      {metric ? (
        <>
          <div className="insight-card-divider" aria-hidden />
          <div className="insight-card-metrics">
            <div className="insight-card-metric-main">
              <span className="insight-card-metric-value">{metric.value}</span>
              {metric.suffix ? (
                <span className="insight-card-metric-suffix">{metric.suffix}</span>
              ) : null}
            </div>
            <div className="insight-card-metric-meta">
              <span className="insight-card-metric-label">{metric.label}</span>
              {metric.progressHint ? (
                <span className="insight-card-metric-hint">{metric.progressHint}</span>
              ) : null}
            </div>
          </div>
          {typeof metric.progress === "number" && metric.progress > 0 ? (
            <SegmentedProgressBar
              progress={Math.min(100, metric.progress)}
              segments={24}
              className="insight-card-bar"
            />
          ) : null}
        </>
      ) : null}

      {highlight ? (
        <div className="insight-card-block">
          {highlightLabel ? (
            <p className="insight-card-block-label">{highlightLabel}</p>
          ) : null}
          <p className="insight-card-block-body insight-card-block-body--emphasis">
            {highlight}
          </p>
        </div>
      ) : null}

      {summary ? <p className="insight-card-summary">{summary}</p> : null}

      {fix ? (
        <div className="insight-card-block">
          <p className="insight-card-block-label">{fixLabel}</p>
          <p className="insight-card-block-body">{fix}</p>
        </div>
      ) : null}

      {drill ? (
        <div className="insight-card-drill-row">
          <span className="insight-card-drill-label">Drill</span>
          <span className="insight-card-drill-pill">{drill}</span>
        </div>
      ) : null}

      {marker ? (
        <div className="insight-card-block insight-card-block--marker">
          <p className="insight-card-block-label">{markerLabel}</p>
          <p className="insight-card-block-body">{marker}</p>
        </div>
      ) : null}

      {footer}
    </div>
  );
}
