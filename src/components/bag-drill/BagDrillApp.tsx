"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { BagHomeScreen, type BagHomeStartOptions } from "./BagHomeScreen";
import { BagTabBar } from "./BagTabBar";
import { BagCalibrationScreen } from "./BagCalibrationScreen";
import { BagSetupIntroScreen } from "./BagSetupIntroScreen";
import { BagSetupCameraScreen } from "./BagSetupCameraScreen";
import { BagSetupConfigScreen } from "./BagSetupConfigScreen";
import { BagTrainingScreen } from "./BagTrainingScreen";
import { BagSpeedTrainingScreen } from "./BagSpeedTrainingScreen";
import { BagFlurryTrainingScreen } from "./BagFlurryTrainingScreen";
import { BagSummaryScreen } from "./BagSummaryScreen";
import { BagProgressScreen } from "./BagProgressScreen";
import { UpgradeModal } from "./UpgradeModal";
import { ComingSoonModal } from "./ComingSoonModal";
import { IntroScreen } from "@/components/screens/IntroScreen";
import { PWARegister } from "@/components/PWARegister";
import { useBagDrill } from "@/hooks/useBagDrill";
import { useBagFlurry } from "@/hooks/useBagFlurry";
import {
  BYPASS_FREE_TIER,
  consumeFreeComboSession,
  hasFreeSessionsLeft,
  resetFreeSessionsIfNewDay,
} from "@/lib/bag-drill/free-tier";
import { loadBagData, saveSession } from "@/lib/bag-drill/storage";
import {
  notifySessionComplete,
} from "@/lib/pro-sync";
import { isPro } from "@/lib/subscription";
import type { BagCalibration, BagStance } from "@/lib/bag-drill/calibration";
import { loadStoredCalibration } from "@/lib/bag-drill/detection/calibration-store";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import {
  markComingSoonModalShown,
  shouldShowComingSoonModal,
} from "@/lib/bag-drill/coming-soon-storage";
import { buildQuickStartConfig } from "@/lib/bag-drill/quick-start-config";
import { BagDrillProSync } from "@/components/bag-drill/BagDrillProSync";
import type {
  BagCameraMode,
  BagDrillMode,
  BagScreen,
  BagSessionRecord,
  BagTrainingConfig,
  FightFloBagData,
} from "@/lib/bag-drill/types";

const INTRO_SEEN_KEY = "flowbag-intro-seen";

function readInitialScreen(): BagScreen {
  if (typeof window === "undefined") return "intro";
  return sessionStorage.getItem(INTRO_SEEN_KEY) ? "home" : "intro";
}

export function BagDrillApp() {
  const [screen, setScreen] = useState<BagScreen>(readInitialScreen);
  const [data, setData] = useState<FightFloBagData>(() => loadBagData());
  const [config, setConfig] = useState<BagTrainingConfig | null>(null);
  const [lastSession, setLastSession] = useState<BagSessionRecord | null>(null);
  const [cameraModeDraft, setCameraModeDraft] = useState<BagCameraMode>("fighter");
  const [stanceDraft, setStanceDraft] = useState<BagStance>("orthodox");
  const [calibrationDraft, setCalibrationDraft] = useState<BagCalibration | null>(
    null
  );
  const [drillModeDraft, setDrillModeDraft] = useState<BagDrillMode>("combo");
  const [configDraft, setConfigDraft] = useState<Partial<BagTrainingConfig>>({});
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [pro, setProState] = useState(false);
  const [freeUsed, setFreeUsed] = useState(0);
  const [skippedCalibration, setSkippedCalibration] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const releaseMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const drill = useBagDrill();
  const flurry = useBagFlurry();

  const refreshProAndUsage = useCallback(() => {
    resetFreeSessionsIfNewDay();
    setFreeUsed(resetFreeSessionsIfNewDay().count);
    setProState(isPro());
  }, []);

  useEffect(() => {
    refreshProAndUsage();
  }, [refreshProAndUsage]);

  const enterBagFlow = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setScreen("home");
  }, []);

  const dismissComingSoon = useCallback(() => {
    markComingSoonModalShown();
    setComingSoonOpen(false);
  }, []);

  useEffect(() => {
    if (screen !== "home" || !shouldShowComingSoonModal()) return;

    const timer = window.setTimeout(() => {
      markComingSoonModalShown();
      setComingSoonOpen(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [screen]);

  const refreshData = useCallback(() => {
    setData(loadBagData());
  }, []);

  const gateComboStart = useCallback(
    (mode: BagDrillMode, onAllowed: () => void) => {
      const usesFreeComboSlot = mode === "combo" || mode === "speed";
      if (!usesFreeComboSlot || isPro()) {
        onAllowed();
        return;
      }
      resetFreeSessionsIfNewDay();
      if (!hasFreeSessionsLeft()) {
        setFreeUsed(resetFreeSessionsIfNewDay().count);
        setShowUpgrade(true);
        return;
      }
      onAllowed();
    },
    []
  );

  const handleStartFromHome = useCallback(
    (mode: BagDrillMode, options?: BagHomeStartOptions) => {
      gateComboStart(mode, () => {
        setDrillModeDraft(mode);
        setConfigDraft({
          drillMode: mode,
          weaknessFocus: options?.weaknessFocus ?? false,
        });
        if (mode === "speed") {
          setSkippedCalibration(false);
          setCalibrationDraft(null);
          setScreen("setup-camera");
          return;
        }
        setScreen("setup-intro");
      });
    },
    [gateComboStart]
  );

  const startSpeedDrill = useCallback(
    (calibration: BagCalibration | null) => {
      releaseMediaStream();
      const workoutConfig = buildQuickStartConfig(
        "speed",
        {
          ...configDraft,
          cameraMode: cameraModeDraft,
          stance: stanceDraft,
          calibration: calibration ?? undefined,
        },
        cameraModeDraft
      );
      if (!isPro() && !BYPASS_FREE_TIER) {
        consumeFreeComboSession();
        setFreeUsed(resetFreeSessionsIfNewDay().count);
      }
      setConfig(workoutConfig);
      setScreen("speed");
    },
    [cameraModeDraft, configDraft, releaseMediaStream, stanceDraft]
  );

  const handleReady = useCallback(
    (c: BagTrainingConfig) => {
      if ((c.drillMode === "combo" || c.drillMode === "speed") && !isPro() && !BYPASS_FREE_TIER) {
        if (!hasFreeSessionsLeft()) {
          setShowUpgrade(true);
          return;
        }
        consumeFreeComboSession();
        setFreeUsed(resetFreeSessionsIfNewDay().count);
      }
      setConfig(c);
      setScreen(
        c.drillMode === "flurry"
          ? "flurry"
          : c.drillMode === "speed"
            ? "speed"
            : "training"
      );
    },
    []
  );

  const startWorkoutDirect = useCallback(() => {
    const mode = drillModeDraft;
    gateComboStart(mode, () => {
      if (mode === "combo" || mode === "speed") {
        if (!isPro() && !BYPASS_FREE_TIER) {
          consumeFreeComboSession();
          setFreeUsed(resetFreeSessionsIfNewDay().count);
        }
      }
      setSkippedCalibration(true);
      setCalibrationDraft(null);
      releaseMediaStream();
      const workoutConfig = buildQuickStartConfig(
        mode,
        {
          ...configDraft,
          cameraMode: cameraModeDraft,
          stance: stanceDraft,
        },
        cameraModeDraft
      );
      setConfig(workoutConfig);
      setScreen(mode === "flurry" ? "flurry" : "training");
    });
  }, [
    cameraModeDraft,
    configDraft,
    drillModeDraft,
    gateComboStart,
    releaseMediaStream,
    stanceDraft,
  ]);

  const handleStopCombo = useCallback(() => {
    const record = drill.stop();
    releaseMediaStream();
    const hasSpeedData =
      record?.sessionType === "speed" &&
      record.strikeSpeeds &&
      Object.keys(record.strikeSpeeds).length > 0;
    if (record && (record.totalPunches > 0 || hasSpeedData)) {
      const updated = saveSession(record);
      setData(updated);
      setLastSession(record);
      void notifySessionComplete({
        sessionType: record.sessionType ?? "combo",
        combosThrown: Math.max(1, Object.keys(record.comboReactions).length),
      });
      setScreen("summary");
    } else {
      setScreen("home");
    }
    setConfig(null);
  }, [drill]);

  const handleStopFlurry = useCallback(() => {
    const record = flurry.stop();
    if (record) {
      const updated = saveSession(record);
      setData(updated);
      setLastSession(record);
      void notifySessionComplete({ sessionType: "flurry" });
      setScreen("summary");
    } else {
      setScreen("home");
    }
    setConfig(null);
  }, [flurry]);

  const handleStartRecommended = useCallback(
    (partial: Partial<BagTrainingConfig>) => {
      const mode = partial.drillMode ?? "combo";
      gateComboStart(mode, () => {
        setConfigDraft({
          ...partial,
          cameraMode: partial.cameraMode ?? cameraModeDraft,
        });
        setDrillModeDraft(mode);
        setScreen("setup-intro");
      });
    },
    [cameraModeDraft, gateComboStart]
  );

  const handleProgress = useCallback(() => {
    if (!isPro()) {
      setShowUpgrade(true);
      return;
    }
    refreshData();
    setScreen("progress");
  }, [refreshData]);

  const handleGoTrain = useCallback(() => {
    setScreen("home");
  }, []);

  const showHubTabs = screen === "home" || screen === "progress";

  return (
    <>
      <PWARegister />
      <Suspense fallback={null}>
        <BagDrillProSync
          onProReturn={enterBagFlow}
          onRefreshPro={refreshProAndUsage}
        />
      </Suspense>
      {showUpgrade && (
        <UpgradeModal
          sessionsUsed={freeUsed}
          onClose={() => setShowUpgrade(false)}
        />
      )}
      <ComingSoonModal
        open={comingSoonOpen}
        onClose={dismissComingSoon}
      />
      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <IntroScreen
            key="intro"
            title={BAG_COPY.headline}
            subtitle={BAG_COPY.introSubtitle}
            getStartedLabel="Get started"
            onGetStarted={enterBagFlow}
          />
        )}
        {screen === "home" && (
          <BagHomeScreen
            key="home"
            data={data}
            isPro={pro}
            freeSessionsLeft={
              isPro() || BYPASS_FREE_TIER ? null : 5 - freeUsed
            }
            onStart={handleStartFromHome}
            onUpgrade={() => setShowUpgrade(true)}
          />
        )}
        {screen === "setup-intro" && (
          <BagSetupIntroScreen
            key="setup-intro"
            onBack={() => setScreen("home")}
            onStartCalibration={() => {
              setSkippedCalibration(false);
              setCalibrationDraft(null);
              setScreen("setup-camera");
            }}
            onSkipCalibration={startWorkoutDirect}
          />
        )}
        {screen === "setup-camera" && (
          <BagSetupCameraScreen
            key="setup-camera"
            initialMode={cameraModeDraft}
            isPro={pro}
            speedDrill={drillModeDraft === "speed"}
            onBack={() => {
              releaseMediaStream();
              setScreen(drillModeDraft === "speed" ? "home" : "setup-intro");
            }}
            onContinue={(mode, stance, stream) => {
              setCameraModeDraft(mode);
              setStanceDraft(stance);
              mediaStreamRef.current = stream;
              if (drillModeDraft === "speed") {
                setSkippedCalibration(false);
                setScreen("calibration");
                return;
              }
              if (skippedCalibration) {
                setCalibrationDraft(null);
                setScreen("setup-config");
                return;
              }
              const stored = loadStoredCalibration();
              if (mode === "bag") {
                if (stored && stored.testPunchesDetected > 0) {
                  setSkippedCalibration(true);
                  setCalibrationDraft(stored);
                  setStanceDraft(stored.stance);
                  setScreen("setup-config");
                } else {
                  setSkippedCalibration(false);
                  setScreen("calibration");
                }
                return;
              }
              if (stored?.poseReady && stored.guardBaseline) {
                setSkippedCalibration(true);
                setCalibrationDraft(stored);
                setStanceDraft(stored.stance);
                setScreen("setup-config");
              } else {
                setSkippedCalibration(false);
                setScreen("calibration");
              }
            }}
            onUpgrade={() => setShowUpgrade(true)}
          />
        )}
        {screen === "calibration" && (
          <BagCalibrationScreen
            key="calibration"
            purpose={drillModeDraft === "speed" ? "speed" : "combo"}
            cameraMode={cameraModeDraft}
            stance={stanceDraft}
            existingStream={mediaStreamRef.current}
            onStanceChange={setStanceDraft}
            onCameraModeChange={setCameraModeDraft}
            onStreamChange={(stream) => {
              if (mediaStreamRef.current && mediaStreamRef.current !== stream) {
                mediaStreamRef.current.getTracks().forEach((t) => t.stop());
              }
              mediaStreamRef.current = stream;
            }}
            onBack={() => {
              releaseMediaStream();
              if (drillModeDraft === "speed") {
                setScreen("setup-camera");
                return;
              }
              setScreen(skippedCalibration ? "setup-camera" : "setup-intro");
            }}
            onComplete={(cal) => {
              setSkippedCalibration(false);
              setCalibrationDraft(cal);
              setStanceDraft(cal.stance);
              if (drillModeDraft === "speed") {
                startSpeedDrill(cal);
                return;
              }
              setScreen("setup-config");
            }}
          />
        )}
        {screen === "setup-config" && (
          <BagSetupConfigScreen
            key="setup-config"
            cameraMode={cameraModeDraft}
            initialDrillMode={drillModeDraft}
            initialConfig={{
              ...configDraft,
              cameraMode: cameraModeDraft,
              stance: stanceDraft,
              calibration: calibrationDraft ?? undefined,
            }}
            onBack={() =>
              setScreen(skippedCalibration ? "setup-camera" : "calibration")
            }
            onReady={handleReady}
          />
        )}
        {screen === "speed" && config && (
          <BagSpeedTrainingScreen
            key="speed"
            config={config}
            drill={drill}
            mediaStream={mediaStreamRef.current}
            onStop={handleStopCombo}
          />
        )}
        {screen === "training" && config && (
          <BagTrainingScreen
            key="training"
            config={config}
            drill={drill}
            mediaStream={mediaStreamRef.current}
            onStop={handleStopCombo}
          />
        )}
        {screen === "flurry" && config && (
          <BagFlurryTrainingScreen
            key="flurry"
            config={config}
            flurry={flurry}
            data={data}
            onStop={handleStopFlurry}
          />
        )}
        {screen === "summary" && lastSession && (
          <BagSummaryScreen
            key="summary"
            session={lastSession}
            data={data}
            isPro={pro}
            onTrainAgain={() => setScreen("setup-intro")}
            onStartRecommended={handleStartRecommended}
            onHome={() => {
              refreshData();
              refreshProAndUsage();
              setScreen("home");
            }}
          />
        )}
        {screen === "progress" && (
          <BagProgressScreen key="progress" data={data} />
        )}
      </AnimatePresence>
      {showHubTabs && (
        <BagTabBar
          active={screen === "home" ? "train" : "progress"}
          onTrain={handleGoTrain}
          onProgress={handleProgress}
        />
      )}
    </>
  );
}
