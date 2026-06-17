"use client";

import type { GuardInsight } from "@/lib/insights/types";
import { reportPath } from "@/lib/paths";
import { InsightCard } from "@/components/home/InsightCard";
import { FlowAction, FlowEmpty, FlowShell } from "../FlowShell";

interface GuardDropFlowProps {
  insight: GuardInsight | null;
  onUpload: () => void;
  onBack: () => void;
}

export function GuardDropFlow({
  insight,
  onUpload,
  onBack,
}: GuardDropFlowProps) {
  return (
    <FlowShell title="Guard drop tracker" subtitle="Guard-only · timestamped" onBack={onBack}>
      {!insight ? (
        <FlowEmpty message="Upload and analyse a clip first — we'll flag every moment your guard drops." />
      ) : (
        <>
          <InsightCard
            kicker="Latest clip"
            accentKicker
            variant="guard"
            title={insight.title}
            titleVariant="body"
            metric={
              insight.dropCount === 0
                ? {
                    value: "0",
                    suffix: "guard drops",
                    label: "detected in this clip",
                    progressHint: "Keep this discipline in live rounds",
                  }
                : {
                    value: insight.dropCount,
                    suffix: insight.dropCount === 1 ? "drop" : "drops",
                    label: "flagged in this clip",
                    progress: insight.dropPercent,
                    progressHint:
                      insight.dropPercent > 0
                        ? `${insight.dropPercent}% of frames with pose`
                        : undefined,
                  }
            }
            summary={insight.dropCount > 0 ? insight.summary : undefined}
            fix={
              insight.dropCount > 0
                ? insight.moments[0]?.fix ?? insight.mechanicalFix
                : insight.summary
            }
            fixLabel={insight.dropCount > 0 ? "First fix to try" : "Summary"}
            drill={insight.dropCount > 0 ? insight.drillName : undefined}
          />

          {insight.dropCount > 0 && insight.moments.length > 0 ? (
            <div className="guard-moment-list">
              <p className="guard-moment-list-label">Timestamped guard drops</p>
              <ul className="guard-moment-list-items">
                {insight.moments.map((moment) => (
                  <li key={moment.id} className="guard-moment-item">
                    <span className="guard-moment-time">{moment.timestamp}</span>
                    <div className="guard-moment-copy">
                      <p className="guard-moment-title">{moment.title}</p>
                      <p className="guard-moment-detail">{moment.detail}</p>
                      <p className="guard-moment-fix">{moment.fix}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {insight.dropCount > 0 ? (
            <FlowAction href={reportPath(insight.sessionId, "guard")}>
              Replay drops in guard mode
            </FlowAction>
          ) : (
            <FlowAction href={reportPath(insight.sessionId, "guard")}>
              Open guard mode
            </FlowAction>
          )}
          <FlowAction variant="secondary" onClick={onUpload}>
            Upload new clip
          </FlowAction>
        </>
      )}
    </FlowShell>
  );
}
