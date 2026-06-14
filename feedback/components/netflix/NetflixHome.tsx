"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DevModeBanner } from "@/components/shared/DevModeBanner";
import { PaywallSheet } from "@/components/shared/PaywallSheet";
import { HomeStickyNav } from "@/components/netflix/HomeStickyNav";
import { NetflixShell } from "@/components/netflix/NetflixShell";
import { SessionLibrary } from "@/components/netflix/SessionLibrary";
import { ProgressBar } from "@/components/upload/ProgressBar";
import { UploadZone, type UploadZoneHandle } from "@/components/upload/UploadZone";
import { PRICING } from "@/config/pricing";
import { SELECTABLE_SPORTS, SPORTS } from "@/config/sports";
import { useSessionLibrary } from "@/hooks/useSessionLibrary";
import { useUpload } from "@/hooks/useUpload";
import { useUploadStatusTicker } from "@/hooks/useUploadStatusTicker";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import { storeUserId } from "@/lib/storage/client";
import type { SkillLevel, SportId } from "@/types";

const LEVELS: { id: SkillLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "pro", label: "Pro" },
];

type HomeView = "home" | "sport" | "level";
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

  const handleFile = useCallback(
    async (file: File) => {
      const sessionId = await upload(file, sport, level);
      if (sessionId) router.push(`/report/${sessionId}`);
    },
    [upload, sport, level, router]
  );

  const handleDemo = useCallback(async () => {
    setDemoError(null);
    setDemoLoading(true);
    setActiveCard("demo");

    try {
      const storedUserId =
        typeof window !== "undefined"
          ? localStorage.getItem("feedback_anon_user_id")
          : null;

      const response = await fetch("/api/demo", {
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
      router.push(`/report/${data.sessionId}`);
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Demo failed");
      setDemoLoading(false);
    }
  }, [sport, level, router]);

  const openUpload = () => {
    setMainTab("home");
    setActiveCard("upload");
    uploadRef.current?.open();
  };

  const goToLibrary = () => {
    setView("home");
    setMainTab("library");
    void refetchLibrary();
  };

  const goToHome = () => {
    setView("home");
    setMainTab("home");
  };

  useEffect(() => {
    if (error && paywallMode) setShowPaywall(true);
  }, [error, paywallMode]);

  const handlePaywallCheckout = useCallback(async () => {
    const userId = localStorage.getItem("feedback_anon_user_id");
    if (!userId || !paywallMode) return;

    const res = await fetch("/api/checkout", {
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
            </header>

            <div className="glass-grid">
              <button
                type="button"
                className={`glass-card ${activeCard === "upload" ? "glass-card--active" : ""}`}
                onClick={openUpload}
              >
                <IconBadge>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </IconBadge>
                <span className="glass-card-label">
                  Upload a clip and get timestamped coaching
                </span>
              </button>

              <button
                type="button"
                className={`glass-card ${activeCard === "demo" ? "glass-card--active" : ""}`}
                onClick={handleDemo}
              >
                <IconBadge>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </IconBadge>
                <span className="glass-card-label">
                  See a sample breakdown report
                </span>
              </button>

              <button
                type="button"
                className={`glass-card ${activeCard === "sport" ? "glass-card--active" : ""}`}
                onClick={() => {
                  setActiveCard("sport");
                  setView("sport");
                }}
              >
                <IconBadge>
                  <span className="text-base leading-none">{SPORTS[sport].emoji}</span>
                </IconBadge>
                <span className="glass-card-label">
                  Choose your sport — {SPORTS[sport].name}
                </span>
              </button>

              <button
                type="button"
                className={`glass-card ${activeCard === "level" ? "glass-card--active" : ""}`}
                onClick={() => {
                  setActiveCard("level");
                  setView("level");
                }}
              >
                <IconBadge>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </IconBadge>
                <span className="glass-card-label">
                  Set your level — {level}
                </span>
              </button>
            </div>

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
        ) : (
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
