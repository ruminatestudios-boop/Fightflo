"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CYCLING_WORDS = ["Fix", "Improve", "Sharpen", "Correct"];

function CyclingHeadline() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % CYCLING_WORDS.length);
        setFade(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1 className="glass-greeting-title" style={{ maxWidth: "none" }}>
      <span style={{ display: "block" }}>Train hard.</span>
      <span style={{ display: "block", whiteSpace: "nowrap" }}>
        <span
          style={{
            color: "#e53e3e",
            display: "inline-block",
            transition: "opacity 0.3s ease",
            opacity: fade ? 1 : 0,
            fontFamily: "var(--font-script)",
            fontSize: "1.1em",
            fontWeight: 400,
            fontStyle: "italic",
          }}
        >
          {CYCLING_WORDS[index]}
        </span>
        {" what's actually wrong."}
      </span>
    </h1>
  );
}
import { useRouter } from "next/navigation";
import { FEED_COPY } from "@/lib/copy";
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
import { FeedStickyNav } from "@/components/netflix/FeedStickyNav";
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
import { readHomeUrlState, writeHomeUrlState, type HomeRoute } from "@/lib/homeViews";
import {
  getStoredUserName,
  getStoredCrewToken,
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

interface NetflixHomeProps {
  /** `feed` = photo-card preview homepage at /feed */
  homeRoute?: HomeRoute;
}

export function NetflixHome({ homeRoute = "home" }: NetflixHomeProps) {
  const router = useRouter();
  const uploadRef = useRef<UploadZoneHandle>(null);
  const [sport, setSport] = useState<SportId>("boxing");
  const [level, setLevel] = useState<SkillLevel>("intermediate");
  const [view, setView] = useState<HomeView>("home");
  const [mainTab, setMainTab] = useState<MainTab>("home");
  const [activeCard, setActiveCard] = useState("upload");
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isPro, setIsPro] = useState(isClientProUnlocked());
  const [isActuallyPro, setIsActuallyPro] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [settingsModal, setSettingsModal] = useState<HomeSettingsModal>(null);
  const [libraryPaywallMode, setLibraryPaywallMode] = useState<"pro" | "topup" | null>(
    null
  );
  const [followUpParentId, setFollowUpParentId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [longVideoWarning, setLongVideoWarning] = useState(false);
  const [offlineWarning, setOfflineWarning] = useState(false);
  const [liveRecordOpen, setLiveRecordOpen] = useState(false);
  const [shadowRoundSeconds, setShadowRoundSeconds] = useState<ShadowRoundLength | null>(
    null
  );
  const { phase, progress, message, error, paywallMode, upload, cancel, reset } =
    useUpload();
  const isBusy = phase === "uploading" || phase === "processing";
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
    setShadowRoundSeconds(null);
    setView("home");
    setMainTab("home");
    writeHomeUrlState("home", "home", homeRoute);
    setLiveRecordOpen(true);
  }, [homeRoute]);

  const openShadowRound = useCallback((seconds: ShadowRoundLength) => {
    setLiveRecordOpen(false);
    setShadowRoundSeconds(seconds);
  }, []);

  const doUpload = useCallback(
    async (file: File) => {
      const sessionId = await upload(file, sport, level, followUpParentId ?? undefined);
      setFollowUpParentId(null);
      if (sessionId) {
        void refetchInsights();
        void refetchLibrary();
        router.push(reportPath(sessionId));
      }
    },
    [upload, sport, level, followUpParentId, router, refetchInsights, refetchLibrary]
  );

  const handleFile = useCallback(
    async (file: File) => {
      // Offline check
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOfflineWarning(true);
        return;
      }

      // Duration check — warn if video is over 3 minutes
      const checkDuration = (): Promise<number> =>
        new Promise((resolve) => {
          const url = URL.createObjectURL(file);
          const vid = document.createElement("video");
          vid.preload = "metadata";
          vid.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(vid.duration); };
          vid.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
          vid.src = url;
        });

      const duration = await checkDuration();
      if (duration > 180) {
        setPendingFile(file);
        setLongVideoWarning(true);
        return;
      }

      await doUpload(file);
    },
    [doUpload]
  );

  const handleLiveRecordingComplete = useCallback(
    async (file: File) => {
      setLiveRecordOpen(false);
      await handleFile(file);
    },
    [handleFile]
  );

  const openUpload = useCallback(() => {
    setFollowUpParentId(null);
    setMainTab("home");
    setView("home");
    setActiveCard("upload");
    writeHomeUrlState("home", "home", homeRoute);
    uploadRef.current?.open();
  }, [homeRoute]);

  // Opens the file picker directly without changing the view — used by
  // the Upload/Record action buttons so the picker appears immediately.
  const openPickerDirect = useCallback(() => {
    setFollowUpParentId(null);
    uploadRef.current?.open();
  }, []);

  const openFollowUpUpload = useCallback((parentSessionId: string) => {
    setFollowUpParentId(parentSessionId);
    setMainTab("home");
    setView("home");
    setActiveCard("reupload");
    writeHomeUrlState("home", "home", homeRoute);
    uploadRef.current?.open();
  }, [homeRoute]);

  const goToLibrary = useCallback(() => {
    setView("home");
    setMainTab("library");
    writeHomeUrlState("home", "library", homeRoute);
    void refetchLibrary();
  }, [refetchLibrary, homeRoute]);

  const goToHome = useCallback(() => {
    setView("home");
    setMainTab("home");
    writeHomeUrlState("home", "home", homeRoute);
    void refetchInsights();
  }, [refetchInsights, homeRoute]);

  const openReport = useCallback(
    (sessionId: string) => {
      router.push(reportPath(sessionId));
    },
    [router]
  );

  const handleFeatureSelect = useCallback(
    (id: HomeFeatureId) => {
      const hasClip = (insights?.completeCount ?? 0) > 0;
      const requiresClip = id === "reupload" || id === "progress" || id === "weekly";
      if (requiresClip && !hasClip) {
        setLockedNotice("Upload a clip to unlock this tool.");
        openUpload();
        return;
      }

      setActiveCard(id);
      if (id === "upload") {
        openUpload();
        return;
      }
      if (id === "guard") {
        openLiveRecord();
        return;
      }
      setView(id);
      setMainTab("home");
      writeHomeUrlState(id, "home", homeRoute);
    },
    [openUpload, homeRoute, insights?.completeCount]
  );

  useEffect(() => {
    if (!lockedNotice) return;
    const t = window.setTimeout(() => setLockedNotice(null), 2600);
    return () => window.clearTimeout(t);
  }, [lockedNotice]);

  const handleShellBack = useCallback(() => {
    if (view !== "home") {
      setView("home");
      writeHomeUrlState("home", mainTab, homeRoute);
      return;
    }
    if (mainTab === "library") {
      goToHome();
    }
  }, [view, mainTab, goToHome, homeRoute]);

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
    const { view: urlView, tab } = readHomeUrlState(homeRoute);
    if (urlView !== "home") {
      setView(urlView);
      setActiveCard(urlView);
    }
    if (tab === "library") {
      setMainTab("library");
    }
  }, [homeRoute]);

  useEffect(() => {
    if (error && paywallMode) {
      // Don't show paywall if user has a crew token — means the server didn't
      // recognise it (env var not deployed yet). Show the error message instead.
      const crewToken = getStoredCrewToken();
      if (!crewToken) setShowPaywall(true);
    }
  }, [error, paywallMode]);

  useEffect(() => {
    const userId = localStorage.getItem("feedback_anon_user_id");
    if (!userId) return;

    void fetch(apiPath(`/api/user/status?userId=${userId}`))
      .then((res) => res.json())
      .then((data: { isPro?: boolean; email?: string | null }) => {
        if (data.isPro) setIsActuallyPro(true);
        if (data.isPro || isClientProUnlocked()) setIsPro(true);
        if (data.email) setUserEmail(data.email);
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
        email: userEmail ?? undefined,
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
            onStartRound={openShadowRound}
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
                <span className="loading-panel-footer-wrap">
                  <span>
                    <span className="loading-panel-keyword">
                      Step {busyUserPhase.index} of 3
                    </span>
                    {uploadStatus.elapsedSec >= 60
                      ? ` — ${Math.floor(uploadStatus.elapsedSec / 60)}m ${uploadStatus.elapsedSec % 60}s elapsed, keep this screen open`
                      : ` — ${busyUserPhase.detail}`}
                  </span>
                  {(phase === "uploading" || phase === "processing") ? (
                    <button
                      type="button"
                      className="loading-panel-cancel"
                      onClick={cancel}
                    >
                      {phase === "uploading" ? "Cancel upload" : "Cancel"}
                    </button>
                  ) : null}
                </span>
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
          <div className={`glass-home-inner ${homeRoute === "feed" ? "glass-home-inner--feed" : ""}`}>
            <header className="glass-greeting">
              {homeRoute === "feed" ? (
                <>
                  <CyclingHeadline />
                  <p className="glass-greeting-lead">{FEED_COPY.body}</p>
                  <p className="glass-greeting-select">
                    Select an option below{" "}
                    <span style={{ color: "#fa4141" }}>▼</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="glass-greeting-sub">Ready to improve</p>
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
                </>
              )}
            </header>


            {lockedNotice ? (
              <p className="glass-followup-banner" role="status">
                {lockedNotice}
              </p>
            ) : null}

            <HomeFeatureGrid
              insights={insightsLoading ? null : insights}
              activeId={activeCard}
              onSelect={handleFeatureSelect}
              variant={homeRoute === "feed" ? "feed" : "default"}
              onUpload={openPickerDirect}
              onRecord={openLiveRecord}
              onPricing={() => setShowPricingModal(true)}
              isPro={isPro}
            />

            {error && (
              <div className="mt-4 space-y-3">
                <p className="glass-error">{error}</p>
                {paywallMode ? (
                  <button
                    type="button"
                    className="w-full rounded-card border border-white/20 py-3 text-sm text-white"
                    onClick={() => setShowPaywall(true)}
                  >
                    {paywallMode === "topup" ? "Buy scan pack" : "Upgrade to Pro"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="upload-retry-btn"
                    onClick={() => { reset(); uploadRef.current?.open(); }}
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            {homeRoute === "feed" ? null : (
              <HomePricingFooter onPlansClick={() => setShowPricingModal(true)} />
            )}
          </div>
        ) : (
          renderFlow()
        )}

        <UploadZone ref={uploadRef} hidden onFileSelect={handleFile} />

        {!isBusy && !liveRecordOpen && !shadowRoundSeconds && (
          homeRoute === "feed" ? (
            <FeedStickyNav
              activeTab={mainTab}
              onTabChange={(tab) => (tab === "library" ? goToLibrary() : goToHome())}
              onUpload={openUpload}
              onRecord={openLiveRecord}
              onSettings={() => {
                setNameDraft(userName ?? "");
                setSettingsModal("hub");
              }}
              libraryCount={sessions.length}
            />
          ) : (
            <HomeStickyNav
              activeTab={mainTab}
              onTabChange={(tab) => (tab === "library" ? goToLibrary() : goToHome())}
              onRecord={openLiveRecord}
              libraryCount={sessions.length}
            />
          )
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
              writeHomeUrlState("home", "home", homeRoute);
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
        onNavigate={setSettingsModal}
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
        isPro={isActuallyPro}
        onClose={() => setShowPricingModal(false)}
        onCheckout={async (plan) => {
          try {
            let userId = localStorage.getItem("feedback_anon_user_id");
            // Ensure a user exists in the DB (creates one if needed)
            const ensureRes = await fetch(apiPath("/api/user/ensure"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, sport, level }),
            });
            if (!ensureRes.ok) throw new Error("Could not create user session");
            const ensureData = await ensureRes.json() as { userId?: string };
            const resolvedId = ensureData.userId;
            if (!resolvedId) throw new Error("No user ID returned");
            // Persist so upload and other flows reuse the same user
            storeUserId(resolvedId);

            const res = await fetch(apiPath("/api/checkout"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan, userId: resolvedId, email: userEmail ?? undefined }),
            });
            const data = await res.json() as { url?: string; error?: string };
            if (data.url) {
              window.location.href = data.url;
            } else {
              setLockedNotice(data.error ?? "Checkout failed. Please try again.");
            }
          } catch (err) {
            setLockedNotice(err instanceof Error ? err.message : "Checkout failed. Please check your connection.");
          }
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

      {/* Long video warning */}
      {longVideoWarning && (
        <div className="ux-sheet-backdrop" onClick={() => setLongVideoWarning(false)}>
          <div className="ux-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="ux-sheet-title">Long video detected</p>
            <p className="ux-sheet-body">
              For the sharpest coaching, we recommend clips under 3 minutes. Longer videos
              still work but analysis takes longer and focuses on fewer moments.
            </p>
            <button
              type="button"
              className="ux-sheet-btn-primary"
              onClick={() => { setLongVideoWarning(false); void doUpload(pendingFile!); }}
            >
              Upload anyway
            </button>
            <button
              type="button"
              className="ux-sheet-btn-secondary"
              onClick={() => { setLongVideoWarning(false); setPendingFile(null); uploadRef.current?.open(); }}
            >
              Pick a shorter clip
            </button>
          </div>
        </div>
      )}

      {/* Offline warning */}
      {offlineWarning && (
        <div className="ux-sheet-backdrop" onClick={() => setOfflineWarning(false)}>
          <div className="ux-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="ux-sheet-title">No internet connection</p>
            <p className="ux-sheet-body">
              Connect to Wi-Fi or mobile data before uploading — your video needs a stable
              connection to reach our servers.
            </p>
            <button
              type="button"
              className="ux-sheet-btn-primary"
              onClick={() => setOfflineWarning(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </NetflixShell>
  );
}
