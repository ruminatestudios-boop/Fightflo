"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SessionTimerUI } from "@/components/training/SessionTimerUI";
import {
  TimerHomeScreen,
  defaultConfigFromPresetId,
} from "@/components/timer/TimerHomeScreen";
import { TimerSummaryScreen } from "@/components/timer/TimerSummaryScreen";
import { PWARegister } from "@/components/PWARegister";
import { useBoxingTimer } from "@/hooks/useBoxingTimer";
import { loadTimerConfig, saveTimerConfig } from "@/lib/boxing-timer/storage";
import type { TimerConfig, TimerSessionStats } from "@/lib/boxing-timer/types";

type Screen = "home" | "active" | "summary";

export function BoxingTimerApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [config, setConfig] = useState<TimerConfig>(() => loadTimerConfig());
  const [summary, setSummary] = useState<TimerSessionStats | null>(null);

  const timer = useBoxingTimer();

  useEffect(() => {
    saveTimerConfig(config);
  }, [config]);

  useEffect(() => {
    if (timer.state.screen === "complete" && screen === "active") {
      const stats = timer.stop();
      if (stats) {
        setSummary(stats);
        setScreen("summary");
      }
    }
  }, [timer.state.screen, screen, timer]);

  const handleStart = useCallback(() => {
    setSummary(null);
    setScreen("active");
    timer.start(config);
  }, [config, timer]);

  const handleStop = useCallback(() => {
    const stats = timer.stop();
    if (stats && stats.roundsCompleted > 0) {
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

  return (
    <>
      <PWARegister />
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <TimerHomeScreen
            key="home"
            config={config}
            onConfigChange={(patch) =>
              setConfig((c) => ({ ...c, ...patch, presetId: patch.presetId ?? c.presetId }))
            }
            onSelectPreset={(id) => setConfig(defaultConfigFromPresetId(id))}
            onStart={handleStart}
          />
        )}

        {screen === "active" && (
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
        )}

        {screen === "summary" && summary && (
          <TimerSummaryScreen
            key="summary"
            stats={summary}
            onAgain={handleAgain}
          />
        )}
      </AnimatePresence>
    </>
  );
}
