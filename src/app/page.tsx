"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IntroScreen } from "@/components/screens/IntroScreen";

const INTRO_SEEN_KEY = "fightflo_intro_seen";

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    setShowIntro(true);
    setReady(true);
  }, []);

  const handleGetStarted = () => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    router.replace("/feed");
  };

  if (!ready) return null;
  if (!showIntro) return null;

  return <IntroScreen onGetStarted={handleGetStarted} />;
}
