"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GlassPage } from "@/components/shared/GlassPage";
import { GlassStatusCard } from "@/components/shared/GlassStatusCard";
import { PaywallSheet, type PaywallMode } from "@/components/shared/PaywallSheet";
import { ReportEmailCapture } from "@/components/shared/ReportEmailCapture";
import { PwaInstallModal } from "@/components/shared/PwaInstallModal";
import { StepGuideReport } from "@/components/netflix/StepGuideReport";
import { AnalysisProgressView } from "@/components/shared/AnalysisProgressView";
import { useAnalysisProgress } from "@/hooks/useAnalysisProgress";
import { useReportEmailCapture } from "@/hooks/useReportEmailCapture";
import { SHARE_CAPTIONS } from "@/config/prompts";
import { apiPath } from "@/lib/paths";
import { isClientProUnlocked } from "@/lib/config/proAccess";
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
  const searchParams = useSearchParams();
  const reportMode = searchParams.get("mode") === "guard" ? "guard" : "full";
  const polled = useAnalysisProgress(initialReport ? null : sessionId);
  const report = initialReport ?? polled.report;
  const session = initialSession ?? polled.session;
  const loading = !initialReport && polled.loading;
  const clipsLoading =
    !initialReport &&
    !!report &&
    !!polled.session &&
    polled.session.status === "processing" &&
    (polled.session as { progress_step?: string }).progress_step === "generating_clips";
  const sport = (session?.sport ?? "boxing") as SportId;
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMode, setPaywallMode] = useState<PaywallMode>("pro");
  const [isPro, setIsPro] = useState(initialIsPro || isClientProUnlocked());
  const [bonusScans, setBonusScans] = useState(0);
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(true);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pwaTriggered = useRef(false);
  const pwaRef = useRef<(() => void) | null>(null);

  const userId = session?.user_id ?? null;
  const emailCapture = useReportEmailCapture(userId, sport);

  useEffect(() => {
    const uid =
      userId ??
      (typeof window !== "undefined"
        ? localStorage.getItem("feedback_anon_user_id")
        : null);
    if (!uid) return;

    fetch(apiPath(`/api/user/status?userId=${uid}`))
      .then((r) => r.json())
      .then(
        (
          d: AnalysisAllowance & {
            isPro?: boolean;
            hasEmail?: boolean;
            email?: string | null;
          }
        ) => {
          if (d.isPro || isClientProUnlocked()) setIsPro(true);
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

  // Auto-show upgrade prompt when free user has used their last free analysis
  // Delayed 30s so user can read the report first
  useEffect(() => {
    if (!report || isPro || showPaywall) return;
    const uid =
      userId ??
      (typeof window !== "undefined" ? localStorage.getItem("feedback_anon_user_id") : null);
    if (!uid) return;

    let t: number;
    fetch(apiPath(`/api/user/status?userId=${uid}`))
      .then((r) => r.json())
      .then((d: { used?: number; limit?: number; isPro?: boolean; canAnalyse?: boolean }) => {
        if (d.isPro || d.canAnalyse !== false) return;
        t = window.setTimeout(() => {
          setPaywallMode("pro");
          setShowPaywall(true);
        }, 30000);
      })
      .catch(() => undefined);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, isPro]);

  // Trigger PWA install prompt once, when the report first appears
  useEffect(() => {
    if (!report || pwaTriggered.current) return;
    pwaTriggered.current = true;
    pwaRef.current?.();
  }, [report]);

  const handleShare = useCallback(async () => {
    if (!report) return;
    const caption = SHARE_CAPTIONS[sport] ?? SHARE_CAPTIONS.default;
    const text = `${caption}\n\n${report.main_weakness.title}\n${report.main_weakness.frequency}`;

    if (navigator.share) {
      await navigator.share({ title: "Fightflo AI Coaching", text });
    } else {
      await navigator.clipboard.writeText(text);
      setNotice("Caption copied to clipboard");
      setTimeout(() => setNotice(null), 2500);
    }
  }, [report, sport]);

  const startCheckout = useCallback(
    async (plan: "pro_monthly" | "topup") => {
      const storedUserId =
        userId ?? localStorage.getItem("feedback_anon_user_id");
      if (!storedUserId) return;

      const res = await fetch(apiPath("/api/checkout"), {
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
      <GlassPage innerClassName="glass-home-inner glass-home-inner--busy">
        <AnalysisProgressView
          eyebrow={polled.eyebrow}
          headline={polled.headline}
          message={polled.message}
          progress={polled.overallProgressPercent}
          userPhase={polled.userPhase}
        />
      </GlassPage>
    );
  }

  if (polled.error && !report) {
    return (
      <GlassPage innerClassName="glass-home-inner glass-home-inner--busy">
        <GlassStatusCard
          kicker="Error"
          title="Couldn't load report"
          message={polled.error}
          variant="error"
        />
      </GlassPage>
    );
  }

  if (!report || !session) {
    return (
      <GlassPage innerClassName="glass-home-inner glass-home-inner--busy">
        <GlassStatusCard
          kicker="Not found"
          title="Report unavailable"
          message="This session may have expired or the link is incorrect."
        />
      </GlassPage>
    );
  }

  return (
    <>
      {clipsLoading && (
        <div className="report-clips-loading">
          <span className="report-clips-loading-dot" aria-hidden />
          Cutting your highlight clips — they&apos;ll appear here automatically
        </div>
      )}
      <StepGuideReport
        report={report}
        session={session}
        isPro={isPro}
        mode={reportMode}
        onShare={handleShare}
        onUpgrade={() => openPaywall(isPro ? "topup" : "pro")}
      />

      {hasEmail === false && showEmailCapture && userId && (
        <div className="glass-floating-sheet">
          <div className="glass-floating-sheet-inner">
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

      <PwaInstallModal triggerRef={pwaRef} />

      {notice && (
        <div
          style={{
            position: "fixed",
            bottom: "5rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "0.6rem 1.2rem",
            borderRadius: "999px",
            fontSize: "0.85rem",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          {notice}
        </div>
      )}
    </>
  );
}
