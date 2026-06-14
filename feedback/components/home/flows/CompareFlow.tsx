"use client";

import type { CompareInsight } from "@/lib/insights/types";
import { FlowAction, FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface CompareFlowProps {
  insight: CompareInsight | null;
  onOpenSession: (sessionId: string) => void;
}

export function CompareFlow({
  insight,
  onOpenSession,
}: CompareFlowProps) {
  return (
    <FlowShell title="Compare sessions" subtitle="Before vs after">
      {!insight ? (
        <FlowEmpty message="You need at least two analysed clips to compare sessions." />
      ) : (
        <>
          <FlowPanel>
            <p className="home-flow-body home-flow-body--center">{insight.insight}</p>
          </FlowPanel>
          <div className="home-compare-grid">
            <CompareCard
              label="Latest"
              date={insight.sessionA.date}
              title={insight.sessionA.title}
              weakness={insight.sessionA.weaknessTitle}
              issues={insight.sessionA.issueCount}
              onOpen={() => onOpenSession(insight.sessionA.id)}
            />
            <CompareCard
              label="Previous"
              date={insight.sessionB.date}
              title={insight.sessionB.title}
              weakness={insight.sessionB.weaknessTitle}
              issues={insight.sessionB.issueCount}
              onOpen={() => onOpenSession(insight.sessionB.id)}
            />
          </div>
          <FlowAction onClick={() => onOpenSession(insight.sessionA.id)}>
            Open latest report
          </FlowAction>
        </>
      )}
    </FlowShell>
  );
}

function CompareCard({
  label,
  date,
  title,
  weakness,
  issues,
  onOpen,
}: {
  label: string;
  date: string;
  title: string;
  weakness: string;
  issues: number;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="home-compare-card" onClick={onOpen}>
      <p className="home-flow-eyebrow">
        {label} · {date}
      </p>
      <h3 className="home-flow-heading home-flow-heading--sm">{title}</h3>
      <p className="home-flow-label">Main fault</p>
      <p className="home-flow-body">{weakness}</p>
      <p className="home-compare-meta">{issues} flagged moments</p>
    </button>
  );
}
