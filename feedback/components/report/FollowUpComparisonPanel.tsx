"use client";

import type { FollowUpComparison, FollowUpVerdict } from "@/types";

const VERDICT_LABEL: Record<FollowUpVerdict, string> = {
  fixed: "Fix verified",
  partial: "Progress",
  not_fixed: "Keep drilling",
  mixed: "Mixed session",
};

const VERDICT_CLASS: Record<FollowUpVerdict, string> = {
  fixed: "followup-verdict--fixed",
  partial: "followup-verdict--partial",
  not_fixed: "followup-verdict--not-fixed",
  mixed: "followup-verdict--mixed",
};

interface FollowUpComparisonPanelProps {
  comparison: FollowUpComparison;
  onOpenParent?: (sessionId: string) => void;
}

function ComparisonList({
  title,
  items,
  tone,
}: {
  title: string;
  items: FollowUpComparison["improved"];
  tone: "improved" | "worse" | "unchanged";
}) {
  if (items.length === 0) return null;

  return (
    <div className="followup-list">
      <p className={`followup-list-title followup-list-title--${tone}`}>{title}</p>
      <ul className="followup-list-items">
        {items.map((item) => (
          <li key={`${tone}-${item.label}`} className="followup-list-item">
            <span className="followup-list-label">{item.label}</span>
            <span className="followup-list-detail">{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FollowUpComparisonPanel({
  comparison,
  onOpenParent,
}: FollowUpComparisonPanelProps) {
  return (
    <div className="followup-panel">
      <div className={`followup-verdict ${VERDICT_CLASS[comparison.verdict]}`}>
        {VERDICT_LABEL[comparison.verdict]}
      </div>

      <p className="followup-headline">{comparison.headline}</p>

      {comparison.summary ? (
        <p className="followup-summary">{comparison.summary}</p>
      ) : null}

      <p className="followup-parent-meta">
        Compared to {comparison.parentTitle} — target fault was &ldquo;
        {comparison.parentWeaknessTitle}&rdquo;
      </p>

      <ComparisonList title="Improved" items={comparison.improved} tone="improved" />
      <ComparisonList title="Got worse" items={comparison.regressed} tone="worse" />
      <ComparisonList title="Unchanged" items={comparison.unchanged} tone="unchanged" />

      {onOpenParent ? (
        <button
          type="button"
          className="followup-parent-link"
          onClick={() => onOpenParent(comparison.parentSessionId)}
        >
          View previous report
        </button>
      ) : null}
    </div>
  );
}
