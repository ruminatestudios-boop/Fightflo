"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { PaywallSheet, type PaywallMode } from "@/components/shared/PaywallSheet";
import { ReportEmailCapture } from "@/components/shared/ReportEmailCapture";
import { StepGuideReport } from "@/components/netflix/StepGuideReport";
import { ProgressBar } from "@/components/upload/ProgressBar";
import { useAnalysisProgress } from "@/hooks/useAnalysisProgress";
import { useReportEmailCapture } from "@/hooks/useReportEmailCapture";
import { SHARE_CAPTIONS } from "@/config/prompts";
import type { AnalysisAllowance, Report, Session, SportId } from "@/types";

interface ReportPageClientProps {
  sessionId: string;
  initialReport: Report | null;
  initialSession: Session | null;
  initialIsPro?: boolean;
}

export function ReportPageClient({
  sessionId,
  initialReport,
  initialSession,
  initialIsPro = false,
}: ReportPageClientProps) {
  const polled = useAnalysisProgress(initialReport ? null : sessionId);
  const report = initialReport ?? polled.report;
  const session = initialSession ?? polled.session;
  const loading = !initialReport && polled.loading;
  const sport = (session?.sport ?? "boxing") as SportId;
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMode, setPaywallMode] = useState<PaywallMode>("pro");
  const [isPro, setIsPro] = useState(initialIsPro);
  const [bonusScans, setBonusScans] = useState(0);
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(true);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);

  const userId = session?.user_id ?? null;
  const emailCapture = useReportEmailCapture(userId, sport);

  useEffect(() => {
    const uid =
      userId ??
      (typeof window !== "undefined"
        ? localStorage.getItem("feedback_anon_user_id")
        : null);
    if (!uid) return;

    fetch(`/api/user/status?userId=${uid}`)
      .then((r) => r.json())
      .then(
        (
          d: AnalysisAllowance & {
            isPro?: boolean;
            hasEmail?: boolean;
            email?: string | null;
          }
        ) => {
          if (d.isPro) setIsPro(true);
          if (d.bonusScans) setBonusScans(d.bonusScans);
          if (d.hasEmail) {
            setHasEmail(true);
            setShowEmailCapture(false);
          }
          if (d.email) setStoredEmail(d.email);
        }
      )
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (emailCapture.status === "success") {
      setHasEmail(true);
      setStoredEmail(emailCapture.email.trim());
    }
  }, [emailCapture.status, emailCapture.email]);

  const handleShare = useCallback(async () => {
    if (!report) return;
    const caption = SHARE_CAPTIONS[sport] ?? SHARE_CAPTIONS.default;
    const text = `${caption}\n\n${report.main_weakness.title}\n${report.main_weakness.frequency}`;

    if (navigator.share) {
      await navigator.share({ title: "Fightflo AI Coaching", text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Caption copied to clipboard");
    }
  }, [report, sport]);

  const startCheckout = useCallback(
    async (plan: "pro_monthly" | "topup") => {
      const storedUserId =
        userId ?? localStorage.getItem("feedback_anon_user_id");
      if (!storedUserId) return;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          userId: storedUserId,
          email: (storedEmail ?? emailCapture.email.trim()) || undefined,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    },
    [userId, storedEmail, emailCapture.email]
  );

  const openPaywall = useCallback((mode: PaywallMode) => {
    setPaywallMode(mode);
    setShowPaywall(true);
  }, []);

  const handlePaywallCheckout = useCallback(() => {
    void startCheckout(paywallMode === "topup" ? "topup" : "pro_monthly");
  }, [paywallMode, startCheckout]);

  if (loading) {
    return (
      <AppShell showLogo backHref="/">
        <div className="flex flex-1 flex-col justify-center px-2 pb-20">
          <p className="text-center text-sm text-white/40">{polled.eyebrow}</p>
          <p className="mt-2 text-center text-2xl font-medium text-white">
            {polled.headline}
          </p>
          <div className="mt-10">
            <ProgressBar progress={polled.progressPercent} message={polled.message} />
          </div>
          <p className="mt-6 text-center text-xs text-white/30">
            Usually 2–5 minutes
          </p>
        </div>
      </AppShell>
    );
  }

  if (polled.error && !report) {
    return (
      <AppShell showLogo backHref="/">
        <p className="mt-20 text-center text-sm text-[#fa4141]">{polled.error}</p>
      </AppShell>
    );
  }

  if (!report || !session) {
    return (
      <AppShell showLogo backHref="/">
        <p className="mt-20 text-center text-sm text-white/45">Report not found</p>
      </AppShell>
    );
  }

  return (
    <>
      <StepGuideReport
        report={report}
        session={session}
        isPro={isPro}
        onShare={handleShare}
        onUpgrade={() => openPaywall(isPro ? "topup" : "pro")}
      />

      {hasEmail === false && showEmailCapture && userId && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg">
            <ReportEmailCapture
              email={emailCapture.email}
              onEmailChange={(v) => {
                emailCapture.setEmail(v);
                emailCapture.resetError();
              }}
              status={emailCapture.status}
              onSubmit={() => void emailCapture.submit()}
              onDismiss={() => setShowEmailCapture(false)}
              mainFinding={report.main_weakness.title}
            />
          </div>
        </div>
      )}

      <PaywallSheet
        open={showPaywall}
        mode={paywallMode}
        bonusScans={bonusScans}
        onClose={() => setShowPaywall(false)}
        onCheckout={handlePaywallCheckout}
      />
    </>
  );
}
