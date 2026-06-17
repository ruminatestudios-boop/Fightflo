"use client";

import type { ProgressInsight } from "@/lib/insights/types";
import { InsightCard } from "@/components/home/InsightCard";
import { FaultProgressChart } from "@/components/charts/FaultProgressChart";
import { FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface ProgressFlowProps {
  insight: ProgressInsight | null;
  onBack: () => void;
}

export function ProgressFlow({ insight, onBack }: ProgressFlowProps) {
  if (!insight) {
    return (
      <FlowShell title="Your progress" subtitle="Session metrics" onBack={onBack}>
        <FlowEmpty message="Complete at least one analysis to start tracking progress." />
      </FlowShell>
    );
  }

  const strengthMetrics = insight.metrics.filter((m) => m.group === "strength");
  const focusMetrics = insight.metrics.filter((m) => m.group === "focus");
  const primaryFault = focusMetrics[0] ?? null;

  return (
    <FlowShell title="Your progress" subtitle="Strengths & areas to sharpen" onBack={onBack}>
      <InsightCard
        kicker={`${insight.sessionCount} session${insight.sessionCount === 1 ? "" : "s"} tracked`}
        title={insight.headline}
        summary={insight.headlineDetail}
      />

      {primaryFault && primaryFault.points.length > 1 ? (
        <FlowPanel>
          <p className="home-flow-label">{primaryFault.label}</p>
          <FaultProgressChart
            points={primaryFault.points}
            trend={primaryFault.trend}
            metricLabel={primaryFault.label}
            unit={primaryFault.unit}
            lowerIsBetter={primaryFault.lowerIsBetter}
            height={180}
            maxSessions={8}
          />
        </FlowPanel>
      ) : null}

      {insight.latestMainFault || insight.latestStrengthTitle ? (
        <InsightCard
          kicker="Latest session"
          title={insight.latestStrengthTitle ?? "No strengths flagged"}
          titleVariant="body"
          highlight={insight.latestMainFault ?? undefined}
          highlightLabel="Main fault"
        />
      ) : null}

      {focusMetrics.length > 0 ? (
        <FlowPanel>
          <p className="home-flow-label">Areas to sharpen</p>
          {focusMetrics.map((m) => (
            <div key={m.id} className="progress-simple-row">
              <div className="progress-simple-row-main">
                <p className="progress-simple-row-label">{m.label}</p>
                <p className="progress-simple-row-detail">{m.summary}</p>
              </div>
              <span className={`progress-metric-badge progress-metric-badge--${m.trend}`}>
                {m.trend === "improving" ? "Improving" : m.trend === "worse" ? "Needs work" : "Stable"}
              </span>
            </div>
          ))}
        </FlowPanel>
      ) : null}

      {strengthMetrics.length > 0 ? (
        <FlowPanel>
          <p className="home-flow-label">What&apos;s working</p>
          {strengthMetrics.map((m) => (
            <div key={m.id} className="progress-simple-row">
              <div className="progress-simple-row-main">
                <p className="progress-simple-row-label">{m.label}</p>
                <p className="progress-simple-row-detail">{m.summary}</p>
              </div>
              <span className="progress-metric-badge progress-metric-badge--improving">
                Strength
              </span>
            </div>
          ))}
        </FlowPanel>
      ) : null}

      {insight.latestPositives.length > 0 ? (
        <FlowPanel>
          <p className="home-flow-label">Latest strengths flagged</p>
          {insight.latestPositives.slice(0, 3).map((p) => (
            <div key={p.title} className="progress-simple-row">
              <div className="progress-simple-row-main">
                <p className="progress-simple-row-label">{p.title}</p>
                {p.detail ? <p className="progress-simple-row-detail">{p.detail}</p> : null}
              </div>
            </div>
          ))}
        </FlowPanel>
      ) : null}
    </FlowShell>
  );
}
