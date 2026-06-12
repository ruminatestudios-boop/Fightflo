"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SessionTimerUI } from "@/components/training/SessionTimerUI";
import {
  TimerHomeScreen,
  defaultConfigFromPresetId,
} from "@/components/timer/TimerHomeScreen";
import { TimerSummaryScreen } from "@/components/timer/TimerSummaryScreen";
import { TimerRound3EmailBanner } from "@/components/timer/TimerRound3EmailBanner";
import { TimerEmailCaptureModal } from "@/components/timer/TimerEmailCaptureModal";
import { TimerFirstVisitBanner } from "@/components/timer/TimerFirstVisitBanner";
import { PWARegister } from "@/components/PWARegister";
import { useBoxingTimer } from "@/hooks/useBoxingTimer";
import { loadTimerConfig, saveTimerConfig } from "@/lib/boxing-timer/storage";
import { shouldShowEmailCapture } from "@/lib/boxing-timer/email-capture-storage";
import { recordTimerSessionComplete } from "@/lib/boxing-timer/upsell-storage";
import { isPro } from "@/lib/subscription";
import { syncProFromServer } from "@/lib/pro-sync";
import type { TimerConfig, TimerSessionStats } from "@/lib/boxing-timer/types";

type Screen = "home" | "active" | "summary";

export function BoxingTimerApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [config, setConfig] = useState<TimerConfig>(() => loadTimerConfig());
  const [summary, setSummary] = useState<TimerSessionStats | null>(null);
  const [pro, setPro] = useState(false);
  const [round3Dismissed, setRound3Dismissed] = useState(false);
  const [round3Active, setRound3Active] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const round3ShownThisSessionRef = useRef(false);

  const timer = useBoxingTimer();
  const canCaptureEmail = shouldShowEmailCapture(pro);

  useEffect(() => {
    setPro(isPro());
    void syncProFromServer().then(() => setPro(isPro()));
  }, []);

  useEffect(() => {
    saveTimerConfig(config);
  }, [config]);

  useEffect(() => {
    if (timer.state.screen === "complete" && screen === "active") {
      const stats = timer.stop();
      if (stats) {
        recordTimerSessionComplete();
        setSummary(stats);
        setScreen("summary");
      }
    }
  }, [timer.state.screen, screen, timer]);

  const handleStart = useCallback(() => {
    setSummary(null);
    setRound3Dismissed(false);
    setRound3Active(false);
    setEmailModalOpen(false);
    round3ShownThisSessionRef.current = false;
    setScreen("active");
    timer.start(config);
  }, [config, timer]);

  const handleStop = useCallback(() => {
    const stats = timer.stop();
    if (stats && stats.roundsCompleted > 0) {
      recordTimerSessionComplete();
      setSummary(stats);
      setScreen("summary");
    } else {
      setScreen("home");
    }
  }, [timer]);

  const handleAgain = useCallback(() => {
    setSummary(null);
    setScreen("home");
  }, []);

  const timerMode =
    timer.state.screen === "countdown"
      ? "countdown"
      : timer.state.screen === "rest"
        ? "rest"
        : "active";

  // Round 3 rest email prompt — once per session, rest after round 3 only
  useEffect(() => {
    if (
      screen !== "active" ||
      !canCaptureEmail ||
      timer.state.screen !== "rest" ||
      round3ShownThisSessionRef.current
    ) {
      return;
    }
    const after = timer.state.restAfterRound;
    if (after !== 3) return;

    round3ShownThisSessionRef.current = true;
    setRound3Active(true);
    setRound3Dismissed(false);
  }, [screen, canCaptureEmail, timer.state.screen, timer.state.restAfterRound]);

  const showRound3Banner =
    round3Active && !round3Dismissed && timer.state.screen === "rest";

  return (
    <>
      <PWARegister />
      {screen === "home" && <TimerFirstVisitBanner isPro={pro} />}
      <TimerEmailCaptureModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
      />
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <TimerHomeScreen
            key="home"
            isPro={pro}
            config={config}
            onConfigChange={(patch) =>
              setConfig((c) => ({ ...c, ...patch, presetId: patch.presetId ?? c.presetId }))
            }
            onSelectPreset={(id) => setConfig(defaultConfigFromPresetId(id))}
            onStart={handleStart}
          />
        )}

        {screen === "active" && (
          <>
            <SessionTimerUI
              key="active"
              mode={timerMode}
              seconds={timer.state.secondsRemaining}
              totalSeconds={timer.state.totalSeconds}
              currentRound={timer.state.currentRound}
              totalRounds={timer.state.totalRounds}
              move={
                timer.state.moveLabel
                  ? {
                      label: timer.state.moveLabel,
                      sublabel: timer.state.moveSublabel ?? undefined,
                      pulseKey: `${timer.state.moveLabel}-${timer.state.secondsRemaining}`,
                    }
                  : null
              }
              isPaused={timer.state.isPaused}
              urgent={timer.state.urgent}
              restHint={timer.state.restHint}
              phaseLabel={timer.state.phaseLabel}
              onPause={timer.pause}
              onResume={timer.resume}
              onStop={handleStop}
              onSkipRest={timer.skipRest}
            />
            <TimerRound3EmailBanner
              visible={showRound3Banner}
              onDismiss={() => {
                setRound3Dismissed(true);
                setRound3Active(false);
              }}
              onOpenModal={() => setEmailModalOpen(true)}
            />
          </>
        )}

        {screen === "summary" && summary && (
          <TimerSummaryScreen
            key="summary"
            stats={summary}
            isPro={pro}
            onAgain={handleAgain}
          />
        )}
      </AnimatePresence>
    </>
  );
}
