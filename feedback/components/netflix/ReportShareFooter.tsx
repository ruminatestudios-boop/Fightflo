"use client";

import { useCallback, useState } from "react";
import { absoluteReportUrl } from "@/lib/paths";

interface ReportShareFooterProps {
  sessionId: string;
  onShare?: () => void;
}

export function ReportShareFooter({ sessionId, onShare }: ReportShareFooterProps) {
  const [coachCopied, setCoachCopied] = useState(false);

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

  if (!onShare) return null;

  return (
    <div className="stepguide-share-row">
      <button
        type="button"
        onClick={onShare}
        className="netflix-cta-primary stepguide-share-row-btn"
      >
        Share analysis
      </button>
      <button
        type="button"
        onClick={() => void copyCoachLink()}
        className="netflix-cta-primary stepguide-share-row-btn"
      >
        {coachCopied ? "Link copied" : "Share with coach"}
      </button>
    </div>
  );
}
