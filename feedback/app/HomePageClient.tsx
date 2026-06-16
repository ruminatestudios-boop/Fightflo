"use client";

import { useCallback, useEffect, useState } from "react";
import { NetflixHome } from "@/components/netflix/NetflixHome";
import { FeedbackIntroScreen } from "@/components/screens/FeedbackIntroScreen";
import { PwaInstallModal } from "@/components/shared/PwaInstallModal";
import { clearIntroDismissed } from "@/lib/storage/client";
import { withBasePath } from "@/lib/paths";

export function HomePageClient() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "intro") {
      clearIntroDismissed();
      window.history.replaceState(null, "", withBasePath("/"));
      setShowIntro(true);
    }
  }, []);

  const dismissIntro = useCallback(() => {
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
