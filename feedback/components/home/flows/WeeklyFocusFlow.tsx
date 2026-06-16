"use client";

import { useState } from "react";
import type { WeeklyFocusInsight } from "@/lib/insights/types";
import { useWeeklyJournal } from "@/hooks/useWeeklyJournal";
import {
  formatJournalTimestamp,
  formatWeekLabel,
} from "@/lib/storage/weeklyJournal";
import { InsightCard } from "@/components/home/InsightCard";
import { FlowAction, FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface WeeklyFocusFlowProps {
  insight: WeeklyFocusInsight | null;
  onUpload: () => void;
  onViewReport: (sessionId: string) => void;
  onBack: () => void;
}

export function WeeklyFocusFlow({
  insight,
  onUpload,
  onViewReport,
  onBack,
}: WeeklyFocusFlowProps) {
  const { entries, addEntry, updateEntry, deleteEntry, weekKey } = useWeeklyJournal();
  const [draft, setDraft] = useState("");

  const handleAddNote = () => {
    if (!addEntry(draft)) return;
    setDraft("");
  };

  return (
    <FlowShell title="This week's focus" subtitle="One thing to fix" onBack={onBack}>
      {!insight ? (
        <FlowEmpty message="Your weekly focus appears after your first analysed clip." />
      ) : (
        <>
          <InsightCard
            kicker="Fix first"
            accentKicker
            variant="accent"
            title={insight.weaknessTitle}
            highlight={insight.drillName}
            highlightLabel="This week's drill"
            fix={insight.drillDescription}
            fixLabel="What to do"
            marker={insight.successMarker}
          />
          {insight.patternInsight ? (
            <InsightCard
              kicker="Pattern"
              title="What we keep seeing"
              summary={insight.patternInsight}
            />
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

      <FlowPanel className="home-flow-panel--journal">
        <div className="home-flow-journal-label">
          <span>Training journal</span>
          <span className="home-flow-journal-week">{formatWeekLabel(weekKey)}</span>
        </div>

        <div className="home-flow-journal-compose">
          <textarea
            className="home-flow-journal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What did you drill? How did it feel? What to work on next session…"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <button
            type="button"
            className="home-flow-journal-add"
            disabled={!draft.trim()}
            onClick={handleAddNote}
          >
            Add note
          </button>
        </div>

        {entries.length > 0 ? (
          <ul className="home-flow-journal-list">
            {entries.map((entry) => (
              <li key={entry.id} className="home-flow-journal-item">
                <div className="home-flow-journal-item-head">
                  <time
                    className="home-flow-journal-time"
                    dateTime={entry.updatedAt}
                  >
                    {formatJournalTimestamp(entry.updatedAt)}
                  </time>
                  <button
                    type="button"
                    className="home-flow-journal-delete"
                    aria-label="Delete note"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                <textarea
                  className="home-flow-journal home-flow-journal--entry"
                  value={entry.text}
                  onChange={(e) => updateEntry(entry.id, e.target.value)}
                  rows={3}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-flow-journal-empty">No notes yet this week.</p>
        )}

        <p className="home-flow-journal-hint">
          {entries.length} note{entries.length === 1 ? "" : "s"} saved on this device.
        </p>
      </FlowPanel>
    </FlowShell>
  );
}
