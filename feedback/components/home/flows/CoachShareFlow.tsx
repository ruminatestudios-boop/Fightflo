"use client";

import { useCallback, useState } from "react";
import type { CoachShareInsight } from "@/lib/insights/types";
import { absoluteReportUrl } from "@/lib/paths";
import { FlowAction, FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface CoachShareFlowProps {
  insight: CoachShareInsight | null;
  onBack: () => void;
}

export function CoachShareFlow({ insight, onBack }: CoachShareFlowProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const shareUrl = insight ? absoluteReportUrl(insight.sessionId) : "";

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    setShareError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareError("Could not copy — select the link below and copy manually.");
    }
  }, [shareUrl]);

  const nativeShare = useCallback(async () => {
    if (!insight || !shareUrl) return;
    setShareError(null);
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: `Fightflo coaching — ${insight.title}`,
        text: insight.summary,
        url: shareUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareError("Share failed — try copy link instead.");
    }
  }, [copyLink, insight, shareUrl]);

  return (
    <FlowShell title="Share with coach" subtitle="View-only report link" onBack={onBack}>
      {!insight ? (
        <FlowEmpty message="Analyse a clip first — then send your coach the breakdown link." />
      ) : (
        <>
          <FlowPanel>
            <p className="home-flow-eyebrow">{insight.title}</p>
            <p className="home-flow-body">{insight.summary}</p>
          </FlowPanel>
          <FlowPanel>
            <p className="home-flow-label">Coach link</p>
            <p className="home-flow-link">{shareUrl}</p>
          </FlowPanel>
          <FlowAction onClick={() => void copyLink()}>
            {copied ? "Link copied" : "Copy coach link"}
          </FlowAction>
          <FlowAction variant="secondary" onClick={() => void nativeShare()}>
            Share…
          </FlowAction>
          {shareError ? <p className="glass-error">{shareError}</p> : null}
          <p className="home-flow-hint">
            Anyone with the link can view timestamps, faults, and drills — no account
            needed.
          </p>
        </>
      )}
    </FlowShell>
  );
}
