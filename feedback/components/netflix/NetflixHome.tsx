"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeFeatureGrid, type HomeFeatureId } from "@/components/home/HomeFeatureGrid";
import { HomeSettingsChips } from "@/components/home/HomeSettingsChips";
import {
  HomeSettingsModals,
  type HomeSettingsModal,
} from "@/components/home/HomeSettingsModals";
import { GuardDropFlow } from "@/components/home/flows/GuardDropFlow";
import { ProgressFlow } from "@/components/home/flows/ProgressFlow";
import { ReuploadFlow } from "@/components/home/flows/ReuploadFlow";
import { ShadowRoundFlow } from "@/components/home/flows/ShadowRoundFlow";
import { WeeklyFocusFlow } from "@/components/home/flows/WeeklyFocusFlow";
import { BackButton } from "@/components/shared/BackButton";
import { DevModeBanner } from "@/components/shared/DevModeBanner";
import { HomePricingFooter } from "@/components/home/HomePricingFooter";
import { PaywallSheet } from "@/components/shared/PaywallSheet";
import { PricingModal } from "@/components/shared/PricingModal";
import { HomeStickyNav } from "@/components/netflix/HomeStickyNav";
import { LiveRecordScreen } from "@/components/live/LiveRecordScreen";
import { ShadowRoundScreen } from "@/components/shadow/ShadowRoundScreen";
import { NetflixShell } from "@/components/netflix/NetflixShell";
import { SessionLibrary } from "@/components/netflix/SessionLibrary";
import { AnalysisProgressView } from "@/components/shared/AnalysisProgressView";
import { UploadZone, type UploadZoneHandle } from "@/components/upload/UploadZone";
import { useHomeInsights } from "@/hooks/useHomeInsights";
import { useSessionLibrary } from "@/hooks/useSessionLibrary";
import { isClientProUnlocked } from "@/lib/config/proAccess";
import { useUpload } from "@/hooks/useUpload";
import { useUploadStatusTicker } from "@/hooks/useUploadStatusTicker";
import {
  blendedProgressPercent,
  userPhaseForUploadClient,
} from "@/lib/analysis/userPhases";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import { displayNameFromEmail, formatDisplayName } from "@/lib/user/displayName";
import { apiPath, reportPath } from "@/lib/paths";
import { readHomeUrlState, writeHomeUrlState } from "@/lib/homeViews";
import {
  getStoredUserName,
  storeUserId,
} from "@/lib/storage/client";
import type { SkillLevel, SportId } from "@/types";
import type { ShadowRoundLength } from "@/lib/shadow/types";

type HomeView =
  | "home"
  | "guard"
  | "shadow"
  | "reupload"
  | "progress"
  | "weekly";

type MainTab = "home" | "library";

export function NetflixHome() {
  const router = useRouter();
  const uploadRef = useRef<UploadZoneHandle>(null);
  const [sport, setSport] = useState<SportId>("boxing");
  const [level, setLevel] = useState<SkillLevel>("intermediate");
  const [view, setView] = useState<HomeView>("home");
  const [mainTab, setMainTab] = useState<MainTab>("home");
  const [activeCard, setActiveCard] = useState("upload");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isPro, setIsPro] = useState(isClientProUnlocked());
  const [userName, setUserName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [settingsModal, setSettingsModal] = useState<HomeSettingsModal>(null);
  const [libraryPaywallMode, setLibraryPaywallMode] = useState<"pro" | "topup" | null>(
    null
  );
  const [followUpParentId, setFollowUpParentId] = useState<string | null>(null);
  const [liveRecordOpen, setLiveRecordOpen] = useState(false);
  const [shadowRoundSeconds, setShadowRoundSeconds] = useState<ShadowRoundLength | null>(
    null
  );
  const { phase, progress, message, error, paywallMode, upload, reset } =
    useUpload();
  const isBusy = phase === "uploading" || phase === "processing" || demoLoading;
  const uploadStatus = useUploadStatusTicker(isBusy, message, progress);
  const busyUserPhase = userPhaseForUploadClient(phase, progress);
  const busyOverallProgress = blendedProgressPercent(busyUserPhase.index, progress);
  const busyBarProgress = phase === "uploading" ? progress : busyOverallProgress;
  const {
    sessions,
    loading: libraryLoading,
    error: libraryError,
    refetch: refetchLibrary,
  } = useSessionLibrary(true);
  const {
    insights,
    loading: insightsLoading,
    refetch: refetchInsights,
  } = useHomeInsights(true);

  const openLiveRecord = useCallback(() => {
    setView("home");
    setMainTab("home");
    writeHomeUrlState("home", "home");
    setLiveRecordOpen(true);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const sessionId = await upload(
        file,
        sport,
        level,
        followUpParentId ?? undefined
      );
      setFollowUpParentId(null);
      if (sessionId) {
        void refetchInsights();
        void refetchLibrary();
        router.push(reportPath(sessionId));
      }
    },
    [upload, sport, level, followUpParentId, router, refetchInsights, refetchLibrary]
  );

  const handleLiveRecordingComplete = useCallback(
    async (file: File) => {
      setLiveRecordOpen(false);
      await handleFile(file);
    },
    [handleFile]
  );

  const handleDemo = useCallback(async () => {
    setDemoError(null);
    setDemoLoading(true);

    try {
      const storedUserId =
        typeof window !== "undefined"
          ? localStorage.getItem("feedback_anon_user_id")
          : null;

      const response = await fetch(apiPath("/api/demo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, level, userId: storedUserId }),
      });

      const data = await parseJsonResponse<{
        sessionId?: string;
        userId?: string;
        error?: string;
      }>(response);

      if (!response.ok || !data.sessionId) {
        throw new Error(data.error ?? "Demo failed");
      }

      if (data.userId) storeUserId(data.userId);
      void refetchInsights();
      router.push(reportPath(data.sessionId));
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Demo failed");
      setDemoLoading(false);
    }
  }, [sport, level, router, refetchInsights]);

  const openUpload = useCallback(() => {
    setFollowUpParentId(null);
    setMainTab("home");
    setView("home");
    setActiveCard("upload");
    writeHomeUrlState("home", "home");
    uploadRef.current?.open();
  }, []);

  const openFollowUpUpload = useCallback((parentSessionId: string) => {
    setFollowUpParentId(parentSessionId);
    setMainTab("home");
    setView("home");
    setActiveCard("reupload");
    writeHomeUrlState("home", "home");
    uploadRef.current?.open();
  }, []);

  const goToLibrary = useCallback(() => {
    setView("home");
    setMainTab("library");
    writeHomeUrlState("home", "library");
    void refetchLibrary();
  }, [refetchLibrary]);

  const goToHome = useCallback(() => {
    setView("home");
    setMainTab("home");
    writeHomeUrlState("home", "home");
    void refetchInsights();
  }, [refetchInsights]);

  const openReport = useCallback(
    (sessionId: string) => {
      router.push(reportPath(sessionId));
    },
    [router]
  );

  const handleFeatureSelect = useCallback(
    (id: HomeFeatureId) => {
      setActiveCard(id);
      if (id === "upload") {
        openUpload();
        return;
      }
      setView(id);
      setMainTab("home");
      writeHomeUrlState(id, "home");
    },
    [openUpload]
  );

  const handleShellBack = useCallback(() => {
    if (view !== "home") {
      setView("home");
      writeHomeUrlState("home", mainTab);
      return;
    }
    if (mainTab === "library") {
      goToHome();
    }
  }, [view, mainTab, goToHome]);

  const handleLogoHome = useCallback(() => {
    goToHome();
    setView("home");
    setActiveCard("upload");
    reset();
  }, [goToHome, reset]);

  useEffect(() => {
    const stored = getStoredUserName();
    if (stored) setUserName(formatDisplayName(stored));
  }, []);

  useEffect(() => {
    const { view: urlView, tab } = readHomeUrlState();
    if (urlView !== "home") {
      setView(urlView);
      setActiveCard(urlView);
    }
    if (tab === "library") {
      setMainTab("library");
    }
  }, []);

  useEffect(() => {
    if (error && paywallMode) setShowPaywall(true);
  }, [error, paywallMode]);

  useEffect(() => {
    const userId = localStorage.getItem("feedback_anon_user_id");
    if (!userId) return;

    void fetch(apiPath(`/api/user/status?userId=${userId}`))
      .then((res) => res.json())
      .then((data: { isPro?: boolean; email?: string | null }) => {
        if (data.isPro || isClientProUnlocked()) setIsPro(true);
        if (!getStoredUserName()) {
          const name = displayNameFromEmail(data.email);
          if (name) setUserName(name);
        }
      })
      .catch(() => {});
  }, []);

  const activePaywallMode = libraryPaywallMode ?? paywallMode;

  const handlePaywallCheckout = useCallback(async () => {
    const userId = localStorage.getItem("feedback_anon_user_id");
    if (!userId || !activePaywallMode) return;

    const res = await fetch(apiPath("/api/checkout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePaywallMode === "topup" ? "topup" : "pro_monthly",
        userId,
      }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }, [activePaywallMode]);

  const renderFlow = () => {
    switch (view) {
      case "guard":
        return (
          <GuardDropFlow
            insight={insights?.guard ?? null}
            onUpload={openUpload}
            onBack={handleShellBack}
          />
        );
      case "shadow":
        return (
          <ShadowRoundFlow
            onBack={handleShellBack}
            onStartRound={(seconds) => setShadowRoundSeconds(seconds)}
          />
        );
      case "reupload":
        return (
          <ReuploadFlow
            insight={insights?.reupload ?? null}
            onUploadFollowUp={openFollowUpUpload}
            onViewReport={openReport}
            onBack={handleShellBack}
          />
        );
      case "progress":
        return (
          <ProgressFlow
            insight={insights?.progress ?? null}
            onBack={handleShellBack}
          />
        );
      case "weekly":
        return (
          <WeeklyFocusFlow
            insight={insights?.weeklyFocus ?? null}
            onUpload={openUpload}
            onViewReport={openReport}
            onBack={handleShellBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <NetflixShell onLogoClick={handleLogoHome}>
      <div className="glass-home">
        <div className="glass-orb glass-orb--a" aria-hidden />
        <div className="glass-orb glass-orb--b" aria-hidden />
        <div className="glass-orb glass-orb--c" aria-hidden />

        {isBusy ? (
          <div className="glass-home-inner glass-home-inner--busy">
            <AnalysisProgressView
              eyebrow={uploadStatus.eyebrow}
              headline={uploadStatus.headline}
              message={uploadStatus.message}
              progress={busyBarProgress}
              userPhase={busyUserPhase}
              footer={
                uploadStatus.elapsedSec >= 60 ? (
                  <>
                    <span className="loading-panel-keyword">
                      Step {busyUserPhase.index} of 3
                    </span>
                    {` — ${Math.floor(uploadStatus.elapsedSec / 60)}m ${uploadStatus.elapsedSec % 60}s elapsed, keep this screen open`}
                  </>
                ) : (
                  <>
                    <span className="loading-panel-keyword">
                      Step {busyUserPhase.index} of 3
                    </span>
                    {` — ${busyUserPhase.detail}. Usually 2–5 minutes total.`}
                  </>
                )
              }
            />
          </div>
        ) : mainTab === "library" ? (
          <div className="glass-home-inner glass-home-inner--library">
            <header className="glass-greeting">
              <div className="glass-greeting-eyebrow">
                <BackButton onClick={handleShellBack} />
                <p className="glass-greeting-sub">Your coaching</p>
              </div>
              <h1 className="glass-greeting-title glass-greeting-title--sm">
                Session library
              </h1>
            </header>
            <SessionLibrary
              sessions={sessions}
              loading={libraryLoading}
              error={libraryError}
              onRetry={() => void refetchLibrary()}
              isPro={isPro}
              onUpgrade={() => {
                setLibraryPaywallMode(isPro ? "topup" : "pro");
                setShowPaywall(true);
              }}
            />
          </div>
        ) : view === "home" ? (
          <div className="glass-home-inner">
            <header className="glass-greeting">
              <p className="glass-greeting-sub">
                <span className="glass-greeting-dot" aria-hidden />
                Ready to improve
              </p>
              <h1 className="glass-greeting-title">
                {userName
                  ? `How can we help ${userName}'s training today?`
                  : "How can we help your training today?"}
              </h1>
              <HomeSettingsChips
                sport={sport}
                level={level}
                userName={userName}
                onSportClick={() => setSettingsModal("sport")}
                onLevelClick={() => setSettingsModal("level")}
                onNameClick={() => {
                  setNameDraft(userName ?? "");
                  setSettingsModal("name");
                }}
              />
            </header>

            {followUpParentId && insights?.reupload ? (
              <p className="glass-followup-banner" role="status">
                Follow-up clip — comparing to {insights.reupload.title} (
                {insights.reupload.weaknessTitle})
              </p>
            ) : null}

            <HomeFeatureGrid
              insights={insightsLoading ? null : insights}
              activeId={activeCard}
              onSelect={handleFeatureSelect}
            />

            {(error || demoError) && (
              <div className="mt-4 space-y-3">
                <p className="glass-error">{error ?? demoError}</p>
                {error && paywallMode && (
                  <button
                    type="button"
                    className="w-full rounded-card border border-white/20 py-3 text-sm text-white"
                    onClick={() => setShowPaywall(true)}
                  >
                    {paywallMode === "topup" ? "Buy scan pack" : "Upgrade to Pro"}
                  </button>
                )}
              </div>
            )}

            <HomePricingFooter
              demoLoading={demoLoading}
              onSampleClick={() => void handleDemo()}
              onPlansClick={() => setShowPricingModal(true)}
            />
          </div>
        ) : (
          renderFlow()
        )}

        <UploadZone ref={uploadRef} hidden onFileSelect={handleFile} />

        {!isBusy && !liveRecordOpen && !shadowRoundSeconds && (
          <HomeStickyNav
            activeTab={mainTab}
            onTabChange={(tab) => (tab === "library" ? goToLibrary() : goToHome())}
            onRecord={openLiveRecord}
            libraryCount={sessions.length}
          />
        )}

        {liveRecordOpen && (
          <LiveRecordScreen
            onClose={() => setLiveRecordOpen(false)}
            onRecordingComplete={(file) => void handleLiveRecordingComplete(file)}
          />
        )}

        {shadowRoundSeconds && (
          <ShadowRoundScreen
            roundSeconds={shadowRoundSeconds}
            onClose={() => setShadowRoundSeconds(null)}
            onAnalyseRecording={(file) => {
              setShadowRoundSeconds(null);
              setView("home");
              setActiveCard("upload");
              writeHomeUrlState("home", "home");
              void handleFile(file);
            }}
            onDone={() => setShadowRoundSeconds(null)}
          />
        )}

        <DevModeBanner />
      </div>

      <HomeSettingsModals
        open={settingsModal}
        onClose={() => setSettingsModal(null)}
        sport={sport}
        level={level}
        userName={userName}
        nameDraft={nameDraft}
        onSportChange={setSport}
        onLevelChange={setLevel}
        onUserNameChange={setUserName}
        onNameDraftChange={setNameDraft}
      />

      <PricingModal
        open={showPricingModal}
        isPro={isPro}
        onClose={() => setShowPricingModal(false)}
        onSelectPro={() => {
          setLibraryPaywallMode("pro");
          setShowPaywall(true);
        }}
        onSelectTopUp={() => {
          setLibraryPaywallMode("topup");
          setShowPaywall(true);
        }}
      />

      <PaywallSheet
        open={showPaywall && Boolean(activePaywallMode)}
        mode={activePaywallMode ?? "pro"}
        onClose={() => {
          setShowPaywall(false);
          setLibraryPaywallMode(null);
          reset();
        }}
        onCheckout={() => void handlePaywallCheckout()}
      />
    </NetflixShell>
  );
}
