"use client";

import { useCallback, useEffect, useState } from "react";
import { NetflixHome } from "@/components/netflix/NetflixHome";
import { FeedbackIntroScreen } from "@/components/screens/FeedbackIntroScreen";
import { PwaInstallModal } from "@/components/shared/PwaInstallModal";
import {
  clearIntroDismissed,
  isIntroDismissed,
  markIntroDismissed,
  purgeLegacyIntroPersistence,
} from "@/lib/storage/client";
import { readHomeUrlState } from "@/lib/homeViews";
import { withBasePath } from "@/lib/paths";

export function HomePageClient() {
  const [showIntro, setShowIntro] = useState(() => !isIntroDismissed());

  useEffect(() => {
    purgeLegacyIntroPersistence();
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "intro") {
      clearIntroDismissed();
      window.history.replaceState(null, "", withBasePath("/"));
      setShowIntro(true);
      return;
    }
    if (readHomeUrlState().view !== "home") {
      setShowIntro(false);
    }
  }, []);

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
    </>
  );
}
