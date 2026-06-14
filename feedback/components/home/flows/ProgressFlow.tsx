"use client";

import { FaultProgressChart } from "@/components/charts/FaultProgressChart";
import type { ProgressInsight } from "@/lib/insights/types";
import { FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface ProgressFlowProps {
  insight: ProgressInsight | null;
}

export function ProgressFlow({ insight }: ProgressFlowProps) {
  return (
    <FlowShell title="Your progress" subtitle="Faults over time">
      {!insight ? (
        <FlowEmpty message="Complete at least one analysis to start tracking progress." />
      ) : (
        <>
          <FlowPanel>
            <p className="home-flow-eyebrow">{insight.weaknessLabel}</p>
            <p className="home-flow-body">{insight.summary}</p>
            <p className="home-flow-stat">
              Trend:{" "}
              <span className={`home-flow-trend home-flow-trend--${insight.trend}`}>
                {insight.trend}
              </span>
            </p>
          </FlowPanel>
          <FaultProgressChart points={insight.points} trend={insight.trend} />
        </>
      )}
    </FlowShell>
  );
}
