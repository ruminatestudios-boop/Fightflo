"use client";

import type { ReuploadInsight } from "@/lib/insights/types";
import { InsightCard } from "@/components/home/InsightCard";
import { FlowAction, FlowEmpty, FlowShell } from "../FlowShell";

interface ReuploadFlowProps {
  insight: ReuploadInsight | null;
  onUploadFollowUp: (parentSessionId: string) => void;
  onViewReport: (sessionId: string) => void;
  onBack: () => void;
}

export function ReuploadFlow({
  insight,
  onUploadFollowUp,
  onViewReport,
  onBack,
}: ReuploadFlowProps) {
  return (
    <FlowShell title="Did you fix it?" subtitle="Fix verification" onBack={onBack}>
      {!insight ? (
        <FlowEmpty message="Upload and analyse your first clip — then come back to verify the fix." />
      ) : (
        <>
          <InsightCard
            kicker="Last session"
            title={insight.title}
            highlight={insight.weaknessTitle}
            highlightLabel="Main fault"
            fix={insight.mechanicalFix}
            fixLabel="What to change"
            drill={insight.drillName}
          />
          <p className="home-flow-hint">
            Film the same drill or round again — we&apos;ll compare it to your last
            breakdown.
          </p>
          <FlowAction onClick={() => onUploadFollowUp(insight.sessionId)}>
            Upload follow-up clip
          </FlowAction>
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
