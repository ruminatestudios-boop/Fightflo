"use client";

import type { GuardInsight } from "@/lib/insights/types";
import { reportPath } from "@/lib/paths";
import { FlowAction, FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface GuardDropFlowProps {
  insight: GuardInsight | null;
  onUpload: () => void;
}

export function GuardDropFlow({
  insight,
  onUpload,
}: GuardDropFlowProps) {
  return (
    <FlowShell title="Guard drop tracker" subtitle="Hands-up focus">
      {!insight ? (
        <FlowEmpty message="Upload and analyse a clip first — we'll flag every moment your guard drops." />
      ) : (
        <>
          <FlowPanel className="home-flow-panel--guard">
            <p className="home-flow-eyebrow home-flow-eyebrow--red">Latest clip</p>
            <h2 className="home-flow-heading">{insight.title}</h2>
            <p className="home-flow-label">Guard drops</p>
            <p className="home-flow-body home-flow-body--stat">
              {insight.dropCount === 0
                ? "None detected — strong discipline."
                : `${insight.dropCount} moment${insight.dropCount === 1 ? "" : "s"} flagged${
                    insight.dropPercent > 0 ? ` · ${insight.dropPercent}% of frames` : ""
                  }`}
            </p>
            <p className="home-flow-label">What we track</p>
            <p className="home-flow-body">{insight.summary}</p>
            {insight.dropCount > 0 && (
              <>
                <p className="home-flow-label">How to improve</p>
                <p className="home-flow-body">{insight.mechanicalFix}</p>
                <p className="home-flow-label">Drill</p>
                <p className="home-flow-body">{insight.drillName}</p>
              </>
            )}
          </FlowPanel>
          <p className="home-flow-hint">
            Guard mode replays your clip with red alerts only when hands fall below
            guard height — plus timestamps and fixes.
          </p>
          <FlowAction href={reportPath(insight.sessionId, "guard")}>
            Open guard mode
          </FlowAction>
          <FlowAction variant="secondary" onClick={onUpload}>
            Upload new clip
          </FlowAction>
        </>
      )}
    </FlowShell>
  );
}
