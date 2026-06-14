"use client";

import { useCallback, useState } from "react";
import { NetflixHome } from "@/components/netflix/NetflixHome";
import { FeedbackIntroScreen } from "@/components/screens/FeedbackIntroScreen";

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(true);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  if (showIntro) {
    return <FeedbackIntroScreen onGetStarted={dismissIntro} />;
  }

  return <NetflixHome />;
}
