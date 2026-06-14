"use client";

import type { ReuploadInsight } from "@/lib/insights/types";
import { FlowAction, FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface ReuploadFlowProps {
  insight: ReuploadInsight | null;
  onBack: () => void;
  onUpload: () => void;
  onViewReport: (sessionId: string) => void;
}

export function ReuploadFlow({
  insight,
  onBack,
  onUpload,
  onViewReport,
}: ReuploadFlowProps) {
  return (
    <FlowShell
      title="Did you fix it?"
      subtitle="Fix verification"
      onBack={onBack}
    >
      {!insight ? (
        <FlowEmpty message="Upload and analyse your first clip — then come back to verify the fix." />
      ) : (
        <>
          <FlowPanel>
            <p className="home-flow-eyebrow">Last session</p>
            <h2 className="home-flow-heading">{insight.title}</h2>
            <p className="home-flow-label">Main fault</p>
            <p className="home-flow-body">{insight.weaknessTitle}</p>
            <p className="home-flow-label">What to change</p>
            <p className="home-flow-body">{insight.mechanicalFix}</p>
            <p className="home-flow-label">Drill to run first</p>
            <p className="home-flow-body">{insight.drillName}</p>
          </FlowPanel>
          <p className="home-flow-hint">
            Film the same drill or round again — we&apos;ll compare it to your last
            breakdown.
          </p>
          <FlowAction onClick={onUpload}>Upload follow-up clip</FlowAction>
          <FlowAction
            variant="secondary"
            onClick={() => onViewReport(insight.sessionId)}
          >
            Review last report
          </FlowAction>
        </>
      )}
    </FlowShell>
  );
}
