"use client";

import { useCallback, useEffect, useState } from "react";
import { NetflixHome } from "@/components/netflix/NetflixHome";
import { FeedbackIntroScreen } from "@/components/screens/FeedbackIntroScreen";

const INTRO_SEEN_KEY = "feedback_intro_seen";

export default function HomePage() {
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    setShowIntro(localStorage.getItem(INTRO_SEEN_KEY) !== "1");
  }, []);

  const dismissIntro = useCallback(() => {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
    setShowIntro(false);
  }, []);

  if (showIntro === null) {
    return <div className="fixed inset-0 bg-black" aria-hidden />;
  }

  if (showIntro) {
    return <FeedbackIntroScreen onGetStarted={dismissIntro} />;
  }

  return <NetflixHome />;
}
