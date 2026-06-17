"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedLandingScreen } from "@/components/home/FeedLandingScreen";
import { NetflixHome } from "@/components/netflix/NetflixHome";
import { PwaInstallModal } from "@/components/shared/PwaInstallModal";
import { withBasePath } from "@/lib/paths";

const FEED_LANDING_KEY = "feed_landing_dismissed";

function isFeedLandingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(FEED_LANDING_KEY) === "1";
}

function readLandingQuery(): "force" | "reset" | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("landing");
  if (value === "1" || value === "force") return "force";
  if (value === "reset") return "reset";
  return null;
}

function stripLandingQuery(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("landing")) return;
  params.delete("landing");
  const qs = params.toString();
  const path = withBasePath("/feed");
  window.history.replaceState(null, "", qs ? `${path}?${qs}` : path);
}

/** Alternate homepage preview — landing → photo cards + carousel at /feed */
export function FeedPageClient() {
  const [showLanding, setShowLanding] = useState<boolean | null>(null);

  useEffect(() => {
    const query = readLandingQuery();

    if (query === "reset" || query === "force") {
      sessionStorage.removeItem(FEED_LANDING_KEY);
      setShowLanding(true);
      stripLandingQuery();
      return;
    }

    setShowLanding(!isFeedLandingDismissed());
  }, []);

  const dismissLanding = useCallback(() => {
    sessionStorage.setItem(FEED_LANDING_KEY, "1");
    setShowLanding(false);
  }, []);

  if (showLanding === null) {
    return <div className="feed-landing feed-landing--boot" aria-hidden />;
  }

  if (showLanding) {
    return <FeedLandingScreen onContinue={dismissLanding} />;
  }

  return (
    <>
      <NetflixHome homeRoute="feed" />
      <PwaInstallModal />
    </>
  );
}
