"use client";

import { useCallback, useState } from "react";
import { ReportExperience } from "@/components/netflix/ReportExperience";
import { NetflixShell } from "@/components/netflix/NetflixShell";
import { ProgressBar } from "@/components/upload/ProgressBar";
import { useReport } from "@/hooks/useReport";
import { SHARE_CAPTIONS } from "@/config/prompts";
import type { Report, Session, SportId } from "@/types";

interface ReportPageClientProps {
  sessionId: string;
  initialReport: Report | null;
  initialSession: Session | null;
}

export function ReportPageClient({
  sessionId,
  initialReport,
  initialSession,
}: ReportPageClientProps) {
  const polled = useReport(initialReport ? null : sessionId);
  const report = initialReport ?? polled.report;
  const session = initialSession ?? polled.session;
  const loading = !initialReport && polled.loading;
  const sport = (session?.sport ?? "boxing") as SportId;
  const [showUpgrade, setShowUpgrade] = useState(false);

  const userId = session?.user_id ?? null;

  const handleShare = useCallback(async () => {
    if (!report) return;
    const caption = SHARE_CAPTIONS[sport] ?? SHARE_CAPTIONS.default;
    const text = `${caption}\n\n${report.main_weakness.title}\n${report.main_weakness.frequency}`;

    if (navigator.share) {
      await navigator.share({ title: "Feedback AI Analysis", text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Caption copied to clipboard");
    }
  }, [report, sport]);

  const handleUpgrade = useCallback(async () => {
    const storedUserId =
      userId ?? localStorage.getItem("feedback_anon_user_id");
    if (!storedUserId) return;

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "pro_monthly", userId: storedUserId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setShowUpgrade(true);
  }, [userId]);

  if (loading) {
    return (
      <NetflixShell backHref="/">
        <div className="netflix-slide-inner netflix-gradient-hero">
          <div className="netflix-slide-content justify-center pb-28 text-center">
            <p className="netflix-eyebrow">Analysing</p>
            <h1 className="netflix-display mt-4 max-w-[12rem] mx-auto">
              Reading your movement
            </h1>
            <div className="mx-auto mt-10 w-full max-w-xs">
              <ProgressBar
                progress={polled.progressPercent}
                message={polled.progressMessage}
              />
            </div>
            <p className="mt-4 text-xs text-white/35">Usually 2–5 minutes</p>
          </div>
        </div>
      </NetflixShell>
    );
  }

  if (polled.error && !report) {
    return (
      <NetflixShell backHref="/">
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-[#e50914]">{polled.error}</p>
        </div>
      </NetflixShell>
    );
  }

  if (!report || !session) {
    return (
      <NetflixShell backHref="/">
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-white/45">Report not found</p>
        </div>
      </NetflixShell>
    );
  }

  return (
    <>
      <ReportExperience
        report={report}
        session={session}
        isPro={false}
        onShare={handleShare}
        onUpgrade={handleUpgrade}
      />

      {showUpgrade && (
        <div className="netflix-modal-root">
          <button
            type="button"
            className="netflix-modal-backdrop"
            onClick={() => setShowUpgrade(false)}
          />
          <div className="netflix-modal-sheet">
            <h2 className="netflix-title text-xl">Go Pro</h2>
            <p className="mt-2 text-sm text-white/45">
              15 analyses per month, clips, history & progress.
            </p>
            <p className="mt-4 text-2xl font-medium">
              £9.99<span className="text-sm text-white/40">/mo</span>
            </p>
            <button
              type="button"
              onClick={handleUpgrade}
              className="netflix-cta-primary mt-6 w-full"
            >
              Upgrade now
            </button>
            <button
              type="button"
              onClick={() => setShowUpgrade(false)}
              className="mt-3 w-full py-2 text-xs text-white/40"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}
