"use client";

import { useCallback, useState } from "react";
import { absoluteReportUrl } from "@/lib/paths";

interface ReportShareFooterProps {
  sessionId: string;
  onShare?: () => void;
  mainWeaknessTitle?: string;
}

export function ReportShareFooter({ sessionId, onShare, mainWeaknessTitle }: ReportShareFooterProps) {
  const [coachCopied, setCoachCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = absoluteReportUrl(sessionId);
    const text = mainWeaknessTitle
      ? `My Fightflo coaching report — main issue: ${mainWeaknessTitle}`
      : "Check out my Fightflo coaching report";

    if (navigator.share) {
      try {
        await navigator.share({ title: "Fightflo Coaching Report", text, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCoachCopied(true);
      window.setTimeout(() => setCoachCopied(false), 2500);
    } catch {
      window.prompt("Copy link:", url);
    }
    onShare?.();
  }, [sessionId, mainWeaknessTitle, onShare]);

  const copyCoachLink = useCallback(async () => {
    const url = absoluteReportUrl(sessionId);
    try {
      await navigator.clipboard.writeText(url);
      setCoachCopied(true);
      window.setTimeout(() => setCoachCopied(false), 2500);
    } catch {
      window.prompt("Copy coach link:", url);
    }
  }, [sessionId]);

  return (
    <div className="stepguide-share-row">
      <button
        type="button"
        onClick={() => void handleShare()}
        className="netflix-cta-primary stepguide-share-row-btn"
      >
        {coachCopied ? "Link copied!" : "Share analysis"}
      </button>
      <button
        type="button"
        onClick={() => void copyCoachLink()}
        className="netflix-cta-secondary stepguide-share-row-btn"
      >
        {coachCopied ? "Link copied" : "Share with coach"}
      </button>
    </div>
  );
}
