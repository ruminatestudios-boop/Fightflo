"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeFeatureGrid, type HomeFeatureId } from "@/components/home/HomeFeatureGrid";
import { HomeSettingsChips } from "@/components/home/HomeSettingsChips";
import { CoachShareFlow } from "@/components/home/flows/CoachShareFlow";
import { CompareFlow } from "@/components/home/flows/CompareFlow";
import { ProgressFlow } from "@/components/home/flows/ProgressFlow";
import { ReuploadFlow } from "@/components/home/flows/ReuploadFlow";
import { WeeklyFocusFlow } from "@/components/home/flows/WeeklyFocusFlow";
import { DevModeBanner } from "@/components/shared/DevModeBanner";
import { PaywallSheet } from "@/components/shared/PaywallSheet";
import { HomeStickyNav } from "@/components/netflix/HomeStickyNav";
import { NetflixShell } from "@/components/netflix/NetflixShell";
import { SessionLibrary } from "@/components/netflix/SessionLibrary";
import { ProgressBar } from "@/components/upload/ProgressBar";
import { UploadZone, type UploadZoneHandle } from "@/components/upload/UploadZone";
import { PRICING } from "@/config/pricing";
import { SELECTABLE_SPORTS, SPORTS } from "@/config/sports";
import { useHomeInsights } from "@/hooks/useHomeInsights";
import { useSessionLibrary } from "@/hooks/useSessionLibrary";
import { useUpload } from "@/hooks/useUpload";
import { useUploadStatusTicker } from "@/hooks/useUploadStatusTicker";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import { apiPath, reportPath } from "@/lib/paths";
import { storeUserId } from "@/lib/storage/client";
import type { SkillLevel, SportId } from "@/types";

const LEVELS: { id: SkillLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "pro", label: "Pro" },
];

type HomeView =
  | "home"
  | "sport"
  | "level"
  | "reupload"
  | "progress"
  | "compare"
  | "weekly"
  | "coach-share";

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
      const sessionId = await upload(file, sport, level);
      if (sessionId) {
        void refetchInsights();
        void refetchLibrary();
        router.push(reportPath(sessionId));
      }
    },
    [upload, sport, level, router, refetchInsights, refetchLibrary]
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
    setMainTab("home");
    setView("home");
    setActiveCard("upload");
    uploadRef.current?.open();
  }, []);

  const goToLibrary = () => {
    setView("home");
    setMainTab("library");
    void refetchLibrary();
  };

  const goToHome = () => {
    setView("home");
    setMainTab("home");
    void refetchInsights();
  };

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

  useEffect(() => {
    if (error && paywallMode) setShowPaywall(true);
  }, [error, paywallMode]);

  const handlePaywallCheckout = useCallback(async () => {
    const userId = localStorage.getItem("feedback_anon_user_id");
    if (!userId || !paywallMode) return;

    const res = await fetch(apiPath("/api/checkout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: paywallMode === "topup" ? "topup" : "pro_monthly",
        userId,
      }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }, [paywallMode]);

  const renderFlow = () => {
    switch (view) {
      case "reupload":
        return (
          <ReuploadFlow
            insight={insights?.reupload ?? null}
            onBack={() => setView("home")}
            onUpload={openUpload}
            onViewReport={openReport}
          />
        );
      case "progress":
        return (
          <ProgressFlow
            insight={insights?.progress ?? null}
            onBack={() => setView("home")}
          />
        );
      case "compare":
        return (
          <CompareFlow
            insight={insights?.compare ?? null}
            onBack={() => setView("home")}
            onOpenSession={openReport}
          />
        );
      case "weekly":
        return (
          <WeeklyFocusFlow
            insight={insights?.weeklyFocus ?? null}
            onBack={() => setView("home")}
            onUpload={openUpload}
            onViewReport={openReport}
          />
        );
      case "coach-share":
        return (
          <CoachShareFlow
            insight={insights?.coachShare ?? null}
            onBack={() => setView("home")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <NetflixShell backHref="">
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
            />
          </div>
        ) : view === "home" ? (
          <div className="glass-home-inner">
            <header className="glass-greeting">
              <p className="glass-greeting-sub">Ready to improve</p>
              <h1 className="glass-greeting-title">
                How can we help your training today?
              </h1>
              <HomeSettingsChips
                sport={sport}
                level={level}
                onSportClick={() => setView("sport")}
                onLevelClick={() => setView("level")}
              />
            </header>

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
                    className="w-full rounded-full border border-white/20 py-3 text-sm text-white"
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
              1 free analysis · Pro {PRICING.pro.displayMonthly} · Top-up{" "}
              {PRICING.topUp.display}
            </p>
          </div>
        ) : view === "sport" ? (
          <div className="glass-home-inner">
            <header className="glass-greeting">
              <button type="button" className="glass-back" onClick={() => setView("home")}>
                ← Back
              </button>
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
              <button type="button" className="glass-back" onClick={() => setView("home")}>
                ← Back
              </button>
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
            onUpload={openUpload}
            libraryCount={sessions.length}
          />
        )}

        <DevModeBanner />
      </div>

      <PaywallSheet
        open={showPaywall && Boolean(paywallMode)}
        mode={paywallMode ?? "pro"}
        onClose={() => {
          setShowPaywall(false);
          reset();
        }}
        onCheckout={() => void handlePaywallCheckout()}
      />
    </NetflixShell>
  );
}
