"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeFeatureGrid, type HomeFeatureId } from "@/components/home/HomeFeatureGrid";
import { HomeSettingsChips } from "@/components/home/HomeSettingsChips";
import { GuardDropFlow } from "@/components/home/flows/GuardDropFlow";
import { ProgressFlow } from "@/components/home/flows/ProgressFlow";
import { ReuploadFlow } from "@/components/home/flows/ReuploadFlow";
import { WeeklyFocusFlow } from "@/components/home/flows/WeeklyFocusFlow";
import { DevModeBanner } from "@/components/shared/DevModeBanner";
import { LegalFooter } from "@/components/shared/LegalFooter";
import { PaywallSheet } from "@/components/shared/PaywallSheet";
import { PricingModal } from "@/components/shared/PricingModal";
import { HomeStickyNav } from "@/components/netflix/HomeStickyNav";
import { NetflixShell } from "@/components/netflix/NetflixShell";
import { SessionLibrary } from "@/components/netflix/SessionLibrary";
import { ProgressBar } from "@/components/upload/ProgressBar";
import { UploadZone, type UploadZoneHandle } from "@/components/upload/UploadZone";
import { PRICING } from "@/config/pricing";
import { SELECTABLE_SPORTS, SPORTS } from "@/config/sports";
import { useHomeInsights } from "@/hooks/useHomeInsights";
import { useSessionLibrary } from "@/hooks/useSessionLibrary";
import { isClientProUnlocked } from "@/lib/config/proAccess";
import { useUpload } from "@/hooks/useUpload";
import { useUploadStatusTicker } from "@/hooks/useUploadStatusTicker";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import { displayNameFromEmail, formatDisplayName } from "@/lib/user/displayName";
import { apiPath, reportPath } from "@/lib/paths";
import {
  getStoredUserName,
  storeUserId,
  storeUserName,
} from "@/lib/storage/client";
import type { SkillLevel, SportId } from "@/types";

const LEVELS: { id: SkillLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "pro", label: "Pro" },
];

type HomeView =
  | "home"
  | "name"
  | "sport"
  | "level"
  | "guard"
  | "reupload"
  | "progress"
  | "weekly";

type MainTab = "home" | "library";

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="glass-card-icon" aria-hidden>
      {children}
    </span>
  );
}

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
  const [libraryPaywallMode, setLibraryPaywallMode] = useState<"pro" | "topup" | null>(
    null
  );
  const [followUpParentId, setFollowUpParentId] = useState<string | null>(null);
  const { phase, progress, message, error, paywallMode, upload, reset } =
    useUpload();
  const isBusy = phase === "uploading" || phase === "processing" || demoLoading;
  const uploadStatus = useUploadStatusTicker(isBusy, message, progress);
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
    uploadRef.current?.open();
  }, []);

  const openFollowUpUpload = useCallback((parentSessionId: string) => {
    setFollowUpParentId(parentSessionId);
    setMainTab("home");
    setView("home");
    setActiveCard("reupload");
    uploadRef.current?.open();
  }, []);

  const goToLibrary = useCallback(() => {
    setView("home");
    setMainTab("library");
    void refetchLibrary();
  }, [refetchLibrary]);

  const goToHome = useCallback(() => {
    setView("home");
    setMainTab("home");
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
    },
    [openUpload]
  );

  const showShellBack = view !== "home" || mainTab === "library";

  const handleShellBack = useCallback(() => {
    if (view !== "home") {
      setView("home");
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
          />
        );
      case "reupload":
        return (
          <ReuploadFlow
            insight={insights?.reupload ?? null}
            onUploadFollowUp={openFollowUpUpload}
            onViewReport={openReport}
          />
        );
      case "progress":
        return (
          <ProgressFlow insight={insights?.progress ?? null} />
        );
      case "weekly":
        return (
          <WeeklyFocusFlow
            insight={insights?.weeklyFocus ?? null}
            onUpload={openUpload}
            onViewReport={openReport}
          />
        );
      default:
        return null;
    }
  };

  return (
    <NetflixShell
      onBack={showShellBack ? handleShellBack : undefined}
      onLogoClick={handleLogoHome}
    >
      <div className="glass-home">
        <div className="glass-orb glass-orb--a" aria-hidden />
        <div className="glass-orb glass-orb--b" aria-hidden />

        {isBusy ? (
          <div className="glass-home-inner glass-home-inner--busy">
            <p className="glass-greeting-sub">{uploadStatus.eyebrow}</p>
            <h1 className="glass-greeting-title">{uploadStatus.headline}</h1>
            <div className="glass-progress-wrap">
              <ProgressBar progress={progress} message={uploadStatus.message} />
            </div>
            <p className="glass-meta">Usually 2–5 minutes</p>
          </div>
        ) : mainTab === "library" ? (
          <div className="glass-home-inner glass-home-inner--library">
            <header className="glass-greeting">
              <p className="glass-greeting-sub">Your coaching</p>
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
                onSportClick={() => setView("sport")}
                onLevelClick={() => setView("level")}
                onNameClick={() => {
                  setNameDraft(userName ?? "");
                  setView("name");
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

            <button
              type="button"
              className="home-sample-link"
              onClick={() => void handleDemo()}
              disabled={demoLoading}
            >
              {demoLoading ? "Loading sample…" : "See a sample breakdown report"}
            </button>

            <p className="glass-meta glass-meta--footer">
              {PRICING.free.lifetimeScans}{" "}
              <span className="pricing-free-tag">FREE</span> analysis · Pro{" "}
              {PRICING.pro.displayMonthly} · Top-up {PRICING.topUp.display}{" "}
              <button
                type="button"
                className="pricing-inline-link"
                onClick={() => setShowPricingModal(true)}
              >
                See plans
              </button>
            </p>
            <LegalFooter />
          </div>
        ) : view === "name" ? (
          <div className="glass-home-inner">
            <header className="glass-greeting">
              <h1 className="glass-greeting-title glass-greeting-title--sm">
                What should we call you?
              </h1>
              <p className="glass-greeting-sub">
                Your name appears on the home greeting.
              </p>
            </header>
            <label className="home-name-field">
              First name
              <input
                className="home-name-input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={24}
                placeholder="e.g. Alex"
                autoComplete="given-name"
                autoFocus
              />
            </label>
            <button
              type="button"
              className="home-flow-action home-flow-action--primary"
              onClick={() => {
                const formatted = formatDisplayName(nameDraft);
                if (formatted) {
                  storeUserName(formatted);
                  setUserName(formatted);
                } else {
                  storeUserName(null);
                  setUserName(null);
                }
                setView("home");
              }}
            >
              Save
            </button>
            {userName ? (
              <button
                type="button"
                className="home-flow-action home-flow-action--secondary"
                onClick={() => {
                  storeUserName(null);
                  setUserName(null);
                  setNameDraft("");
                  setView("home");
                }}
              >
                Clear name
              </button>
            ) : null}
          </div>
        ) : view === "sport" ? (
          <div className="glass-home-inner">
            <header className="glass-greeting">
              <h1 className="glass-greeting-title glass-greeting-title--sm">
                What are you training?
              </h1>
            </header>
            <div className="glass-grid">
              {SELECTABLE_SPORTS.map((id) => {
                const cfg = SPORTS[id];
                const selected = sport === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`glass-card ${selected ? "glass-card--active" : ""}`}
                    onClick={() => {
                      setSport(id);
                      setView("home");
                    }}
                  >
                    <IconBadge>
                      <span className="text-base leading-none">{cfg.emoji}</span>
                    </IconBadge>
                    <span className="glass-card-label">{cfg.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : view === "level" ? (
          <div className="glass-home-inner">
            <header className="glass-greeting">
              <h1 className="glass-greeting-title glass-greeting-title--sm">
                How experienced are you?
              </h1>
            </header>
            <div className="glass-grid">
              {LEVELS.map((lvl) => {
                const selected = level === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    className={`glass-card ${selected ? "glass-card--active" : ""}`}
                    onClick={() => {
                      setLevel(lvl.id);
                      setView("home");
                    }}
                  >
                    <IconBadge>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </IconBadge>
                    <span className="glass-card-label">{lvl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          renderFlow()
        )}

        <UploadZone ref={uploadRef} hidden onFileSelect={handleFile} />

        {!isBusy && (
          <HomeStickyNav
            activeTab={mainTab}
            onTabChange={(tab) => (tab === "library" ? goToLibrary() : goToHome())}
            libraryCount={sessions.length}
          />
        )}

        <DevModeBanner />
      </div>

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
