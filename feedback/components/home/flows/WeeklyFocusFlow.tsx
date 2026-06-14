"use client";

import type { WeeklyFocusInsight } from "@/lib/insights/types";
import { FlowAction, FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface WeeklyFocusFlowProps {
  insight: WeeklyFocusInsight | null;
  onUpload: () => void;
  onViewReport: (sessionId: string) => void;
}

export function WeeklyFocusFlow({
  insight,
  onUpload,
  onViewReport,
}: WeeklyFocusFlowProps) {
  return (
    <FlowShell title="This week's focus" subtitle="One thing to fix">
      {!insight ? (
        <FlowEmpty message="Your weekly focus appears after your first analysed clip." />
      ) : (
        <>
          <FlowPanel className="home-flow-panel--accent">
            <p className="home-flow-eyebrow">Fix first</p>
            <h2 className="home-flow-heading">{insight.weaknessTitle}</h2>
          </FlowPanel>
          <FlowPanel>
            <p className="home-flow-label">Drill</p>
            <h3 className="home-flow-heading home-flow-heading--sm">
              {insight.drillName}
            </h3>
            <p className="home-flow-body">{insight.drillDescription}</p>
            <p className="home-flow-label">Success marker</p>
            <p className="home-flow-body">{insight.successMarker}</p>
          </FlowPanel>
          {insight.patternInsight ? (
            <FlowPanel>
              <p className="home-flow-label">Pattern</p>
              <p className="home-flow-body">{insight.patternInsight}</p>
            </FlowPanel>
          ) : null}
          <FlowAction onClick={onUpload}>Upload practice clip</FlowAction>
          <FlowAction
            variant="secondary"
            onClick={() => onViewReport(insight.sessionId)}
          >
            Full breakdown
          </FlowAction>
        </>
      )}
    </FlowShell>
  );
}
