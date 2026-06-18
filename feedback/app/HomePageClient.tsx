"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NetflixHome } from "@/components/netflix/NetflixHome";
import { FeedbackIntroScreen } from "@/components/screens/FeedbackIntroScreen";
import { PwaInstallModal } from "@/components/shared/PwaInstallModal";
import {
  clearIntroDismissed,
  isIntroDismissed,
  markIntroDismissed,
  purgeLegacyIntroPersistence,
  storeCrewToken,
} from "@/lib/storage/client";
import { readHomeUrlState } from "@/lib/homeViews";
import { apiPath, withBasePath } from "@/lib/paths";

export function HomePageClient() {
  const [showIntro, setShowIntro] = useState(() => !isIntroDismissed());
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    purgeLegacyIntroPersistence();
    const params = new URLSearchParams(window.location.search);

    // Crew access — store token and strip from URL
    const crewParam = params.get("crew");
    if (crewParam) {
      storeCrewToken(crewParam);
      params.delete("crew");
      const qs = params.toString();
      window.history.replaceState(null, "", withBasePath(`/${qs ? `?${qs}` : ""}`));
      markIntroDismissed();
      setShowIntro(false);
    }
    if (params.get("intro") === "skip") {
      markIntroDismissed();
      setShowIntro(false);
      params.delete("intro");
      const qs = params.toString();
      window.history.replaceState(null, "", withBasePath(`/${qs ? `?${qs}` : ""}`));
      return;
    }
    if (params.get("reset") === "intro") {
      clearIntroDismissed();
      window.history.replaceState(null, "", withBasePath("/"));
      setShowIntro(true);
      return;
    }
    if (params.get("topup") === "success") {
      markIntroDismissed();
      setShowIntro(false);
      setUpgradeNotice("Scan pack added! Your bonus scans are ready.");
      params.delete("topup");
      const qs = params.toString();
      window.history.replaceState(null, "", withBasePath(`/${qs ? `?${qs}` : ""}`));
      setTimeout(() => setUpgradeNotice(null), 4000);
      return;
    }
    if (params.get("upgraded") === "true") {
      markIntroDismissed();
      setShowIntro(false);
      setUpgradeNotice("Activating your Pro plan…");
      params.delete("upgraded");
      const qs = params.toString();
      window.history.replaceState(null, "", withBasePath(`/${qs ? `?${qs}` : ""}`));

      // Poll /api/user/status until isPro flips true (Stripe webhook may be delayed)
      const userId = localStorage.getItem("feedback_anon_user_id");
      if (userId) {
        let attempts = 0;
        pollRef.current = setInterval(() => {
          attempts++;
          void fetch(apiPath(`/api/user/status?userId=${userId}`))
            .then((r) => r.json())
            .then((d: { isPro?: boolean }) => {
              if (d.isPro) {
                setUpgradeNotice("Pro activated! Welcome to Fightflo Pro.");
                if (pollRef.current) clearInterval(pollRef.current);
                setTimeout(() => setUpgradeNotice(null), 4000);
              } else if (attempts >= 12) {
                // Give up after ~60s, show success anyway (webhook may be slow)
                setUpgradeNotice("Pro activated! Welcome to Fightflo Pro.");
                if (pollRef.current) clearInterval(pollRef.current);
                setTimeout(() => setUpgradeNotice(null), 4000);
              }
            })
            .catch(() => undefined);
        }, 5000);
      }
      return;
    }
    if (readHomeUrlState().view !== "home") {
      setShowIntro(false);
    }
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const dismissIntro = useCallback(() => {
    markIntroDismissed();
    setShowIntro(false);
  }, []);

  if (showIntro) {
    return <FeedbackIntroScreen onGetStarted={dismissIntro} />;
  }

  return (
    <>
      <NetflixHome />
      <PwaInstallModal />
      {upgradeNotice && (
        <div
          style={{
            position: "fixed",
            bottom: "5rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "0.7rem 1.4rem",
            borderRadius: "999px",
            fontSize: "0.9rem",
            zIndex: 9999,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {upgradeNotice}
        </div>
      )}
    </>
  );
}
