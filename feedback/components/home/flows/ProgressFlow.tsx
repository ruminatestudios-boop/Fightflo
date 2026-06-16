"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaultProgressChart } from "@/components/charts/FaultProgressChart";
import type { ProgressInsight, ProgressMetric, ProgressMetricId } from "@/lib/insights/types";
import type { WeaknessTrend } from "@/types";
import { FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface ProgressFlowProps {
  insight: ProgressInsight | null;
  onBack: () => void;
}

const TREND_LABEL: Record<WeaknessTrend, string> = {
  improving: "Improving",
  stable: "Stable",
  worse: "Needs work",
};

function formatDelta(metric: ProgressMetric): string {
  const { firstValue, lastValue, points, unit, trend, lowerIsBetter } = metric;

  if (points.length === 1) {
    return `First reading — ${lastValue} ${unit}`;
  }

  const delta = lastValue - firstValue;
  const absDelta = Math.abs(delta);

  if (trend === "stable" || absDelta === 0) {
    return `Same as session #${points[0].session}`;
  }

  if (lowerIsBetter) {
    const direction = delta > 0 ? "Up" : "Down";
    return `${direction} ${absDelta} ${unit} since session #${points[0].session}`;
  }

  const direction = delta > 0 ? "Up" : "Down";
  const suffix = trend === "improving" ? " — nice" : "";
  return `${direction} ${absDelta} ${unit} since session #${points[0].session}${suffix}`;
}

function ProgressSparkline({
  points,
  trend,
  group,
}: {
  points: ProgressMetric["points"];
  trend: WeaknessTrend;
  group: ProgressMetric["group"];
}) {
  const max = Math.max(...points.map((point) => point.count), 1);
  const recent = points.slice(-12);
  const tone = group === "strength" ? "strength" : trend;

  return (
    <div className="progress-sparkline" aria-hidden>
      {recent.map((point) => (
        <span
          key={point.session}
          className={`progress-sparkline-bar progress-sparkline-bar--${tone}`}
          style={{ height: `${Math.max(12, (point.count / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function ProgressMetricCard({
  metric,
  expanded,
  onToggle,
}: {
  metric: ProgressMetric;
  expanded: boolean;
  onToggle: () => void;
}) {
  const latestSession = metric.points[metric.points.length - 1];

  return (
    <article
      className={`progress-metric-card progress-metric-card--${metric.group} ${expanded ? "progress-metric-card--open" : ""}`}
    >
      <button
        type="button"
        className="progress-metric-card-head"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <div className="progress-metric-card-main">
          <div className="progress-metric-card-top">
            <p className="progress-metric-card-label">{metric.label}</p>
            <span className={`progress-metric-badge progress-metric-badge--${metric.trend}`}>
              {TREND_LABEL[metric.trend]}
            </span>
          </div>

          <div className="progress-metric-card-value-row">
            <p className="progress-metric-card-value">{metric.lastValue}</p>
            <p className="progress-metric-card-unit">{metric.unit}</p>
          </div>

          <p className="progress-metric-card-delta">{formatDelta(metric)}</p>
        </div>

        <div className="progress-metric-card-side">
          <ProgressSparkline points={metric.points} trend={metric.trend} group={metric.group} />
          {latestSession ? (
            <p className="progress-metric-card-session">
              Session #{latestSession.session}
              {latestSession.date ? ` · ${latestSession.date}` : ""}
            </p>
          ) : null}
        </div>
      </button>

      {expanded ? (
        <div className="progress-metric-card-body">
          <p className="progress-metric-card-explain">{metric.explanation}</p>
          <p className="progress-metric-card-summary">{metric.summary}</p>
          <FaultProgressChart
            points={metric.points}
            trend={metric.trend}
            metricLabel={metric.label}
            unit={metric.unit}
            lowerIsBetter={metric.lowerIsBetter}
            maxSessions={10}
          />
        </div>
      ) : null}
    </article>
  );
}

function ProgressSection({
  title,
  hint,
  tone,
  metrics,
  openMetricId,
  onToggle,
}: {
  title: string;
  hint: string;
  tone: "strength" | "focus";
  metrics: ProgressMetric[];
  openMetricId: ProgressMetricId | null;
  onToggle: (id: ProgressMetricId) => void;
}) {
  if (metrics.length === 0) return null;

  return (
    <section className={`progress-section progress-section--${tone}`}>
      <div className="progress-section-head">
        <h2 className="progress-section-title">{title}</h2>
        <p className="progress-section-hint">{hint}</p>
      </div>
      <div className="progress-metric-list">
        {metrics.map((metric) => (
          <ProgressMetricCard
            key={metric.id}
            metric={metric}
            expanded={openMetricId === metric.id}
            onToggle={() => onToggle(metric.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function ProgressFlow({ insight, onBack }: ProgressFlowProps) {
  const [openMetricId, setOpenMetricId] = useState<ProgressMetricId | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (insight && !initialized.current) {
      initialized.current = true;
      setOpenMetricId(insight.defaultMetricId);
    }
  }, [insight]);

  const strengthMetrics = useMemo(
    () => insight?.metrics.filter((metric) => metric.group === "strength") ?? [],
    [insight]
  );
  const focusMetrics = useMemo(
    () => insight?.metrics.filter((metric) => metric.group === "focus") ?? [],
    [insight]
  );
  const strengthsImproving = useMemo(
    () => strengthMetrics.filter((metric) => metric.trend === "improving").length,
    [strengthMetrics]
  );

  if (!insight) {
    return (
      <FlowShell title="Your progress" subtitle="Session metrics" onBack={onBack}>
        <FlowEmpty message="Complete at least one analysis to start tracking progress." />
      </FlowShell>
    );
  }

  return (
    <FlowShell title="Your progress" subtitle="Strengths & areas to sharpen" onBack={onBack}>
      <FlowPanel className="progress-overview">
        <p className="home-flow-eyebrow">{insight.headline}</p>
        <p className="progress-overview-detail">{insight.headlineDetail}</p>
        <div className="progress-overview-stats">
          <div className="progress-overview-stat">
            <span className="progress-overview-stat-value">{insight.sessionCount}</span>
            <span className="progress-overview-stat-label">Sessions</span>
          </div>
          <div className="progress-overview-stat progress-overview-stat--strength">
            <span className="progress-overview-stat-value">
              {insight.latestPositives.length}
            </span>
            <span className="progress-overview-stat-label">Latest strengths</span>
          </div>
          <div className="progress-overview-stat progress-overview-stat--wide progress-overview-stat--strength">
            <span className="progress-overview-stat-value progress-overview-stat-value--text">
              {insight.latestStrengthTitle ?? "None flagged yet"}
            </span>
            <span className="progress-overview-stat-label">Top strength</span>
          </div>
          <div className="progress-overview-stat progress-overview-stat--wide progress-overview-stat--focus">
            <span className="progress-overview-stat-value progress-overview-stat-value--text">
              {insight.latestMainFault}
            </span>
            <span className="progress-overview-stat-label">Main fault</span>
          </div>
        </div>
        {insight.latestPositives.length > 0 ? (
          <ul className="progress-highlight-list">
            {insight.latestPositives.slice(0, 3).map((positive) => (
              <li key={positive.title} className="progress-highlight-item">
                <p className="progress-highlight-title">{positive.title}</p>
                <p className="progress-highlight-detail">{positive.detail}</p>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="progress-overview-hint">
          {strengthsImproving > 0
            ? `${strengthsImproving} strength metric${strengthsImproving === 1 ? "" : "s"} trending up. Tap any card for the session chart.`
            : "Tap a metric to see its chart — we track both what's working and what to sharpen."}
        </p>
      </FlowPanel>

      <ProgressSection
        title="What's working"
        hint="Habits and techniques called out as strengths across your clips."
        tone="strength"
        metrics={strengthMetrics}
        openMetricId={openMetricId}
        onToggle={(id) => setOpenMetricId((current) => (current === id ? null : id))}
      />

      <ProgressSection
        title="Areas to sharpen"
        hint="Faults and habits to keep an eye on — lower numbers usually mean real improvement."
        tone="focus"
        metrics={focusMetrics}
        openMetricId={openMetricId}
        onToggle={(id) => setOpenMetricId((current) => (current === id ? null : id))}
      />
    </FlowShell>
  );
}
