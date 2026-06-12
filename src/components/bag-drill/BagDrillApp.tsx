"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { BagHomeScreen } from "./BagHomeScreen";
import { BagCalibrationScreen } from "./BagCalibrationScreen";
import { BagSetupCameraScreen } from "./BagSetupCameraScreen";
import { BagSetupConfigScreen } from "./BagSetupConfigScreen";
import { BagTrainingScreen } from "./BagTrainingScreen";
import { BagFlurryTrainingScreen } from "./BagFlurryTrainingScreen";
import { BagSummaryScreen } from "./BagSummaryScreen";
import { BagProgressScreen } from "./BagProgressScreen";
import { UpgradeModal } from "./UpgradeModal";
import { IntroScreen } from "@/components/screens/IntroScreen";
import { PWARegister } from "@/components/PWARegister";
import { useBagDrill } from "@/hooks/useBagDrill";
import { useBagFlurry } from "@/hooks/useBagFlurry";
import {
  consumeFreeComboSession,
  hasFreeSessionsLeft,
  resetFreeSessionsIfNewDay,
} from "@/lib/bag-drill/free-tier";
import { loadBagData, saveSession } from "@/lib/bag-drill/storage";
import { buildConfigFromWeeklyPlan, type WeeklyPlanDay } from "@/lib/bag-drill/weekly-plan";
import {
  notifySessionComplete,
  registerDevice,
  syncProFromServer,
} from "@/lib/pro-sync";
import { isPro } from "@/lib/subscription";
import type { BagCalibration, BagStance } from "@/lib/bag-drill/calibration";
import type {
  BagCameraMode,
  BagDrillMode,
  BagScreen,
  BagSessionRecord,
  BagTrainingConfig,
  FightFloBagData,
} from "@/lib/bag-drill/types";

export function BagDrillApp() {
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<BagScreen>("intro");
  const [data, setData] = useState<FightFloBagData>(() => loadBagData());
  const [config, setConfig] = useState<BagTrainingConfig | null>(null);
  const [lastSession, setLastSession] = useState<BagSessionRecord | null>(null);
  const [cameraModeDraft, setCameraModeDraft] = useState<BagCameraMode>("bag");
  const [stanceDraft, setStanceDraft] = useState<BagStance>("orthodox");
  const [calibrationDraft, setCalibrationDraft] = useState<BagCalibration | null>(
    null
  );
  const [drillModeDraft, setDrillModeDraft] = useState<BagDrillMode>("combo");
  const [configDraft, setConfigDraft] = useState<Partial<BagTrainingConfig>>({});
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [pro, setProState] = useState(false);
  const [freeUsed, setFreeUsed] = useState(0);

  const drill = useBagDrill();
  const flurry = useBagFlurry();

  const refreshProAndUsage = useCallback(() => {
    resetFreeSessionsIfNewDay();
    setFreeUsed(resetFreeSessionsIfNewDay().count);
    setProState(isPro());
  }, []);

  useEffect(() => {
    refreshProAndUsage();
    void registerDevice();
    void syncProFromServer().then(() => refreshProAndUsage());

    if (searchParams.get("pro") === "true") {
      setScreen("home");
      void syncProFromServer().then(() => refreshProAndUsage());
    }
  }, [searchParams, refreshProAndUsage]);

  const enterBagFlow = useCallback(() => {
    setScreen("home");
  }, []);

  const refreshData = useCallback(() => {
    setData(loadBagData());
  }, []);

  const gateComboStart = useCallback(
    (mode: BagDrillMode, onAllowed: () => void) => {
      if (mode !== "combo" || isPro()) {
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
    (mode: BagDrillMode, plan?: WeeklyPlanDay) => {
      gateComboStart(mode, () => {
        setDrillModeDraft(mode);
        if (plan) {
          setConfigDraft(buildConfigFromWeeklyPlan(plan, cameraModeDraft));
          setDrillModeDraft(plan.drillMode);
        } else {
          setConfigDraft({ drillMode: mode });
        }
        setScreen("setup-camera");
      });
    },
    [cameraModeDraft, gateComboStart]
  );

  const handleReady = useCallback(
    (c: BagTrainingConfig) => {
      if (c.drillMode === "combo" && !isPro()) {
        if (!hasFreeSessionsLeft()) {
          setShowUpgrade(true);
          return;
        }
        consumeFreeComboSession();
        setFreeUsed(resetFreeSessionsIfNewDay().count);
      }
      setConfig(c);
      setScreen(c.drillMode === "flurry" ? "flurry" : "training");
    },
    []
  );

  const handleStopCombo = useCallback(() => {
    const record = drill.stop();
    if (record && record.totalPunches > 0) {
      const updated = saveSession(record);
      setData(updated);
      setLastSession(record);
      void notifySessionComplete({
        sessionType: "combo",
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
        setScreen("setup-camera");
      });
    },
    [cameraModeDraft, gateComboStart]
  );

  const handleOpenOpponent = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/?train=opponent";
    }
  }, []);

  const handleProgress = useCallback(() => {
    if (!isPro()) {
      setShowUpgrade(true);
      return;
    }
    setScreen("progress");
  }, []);

  return (
    <>
      <PWARegister />
      {showUpgrade && (
        <UpgradeModal
          sessionsUsed={freeUsed}
          onClose={() => setShowUpgrade(false)}
        />
      )}
      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <IntroScreen
            key="intro"
            title={
              <>
                Call. Throw.
                <br />
                Score.
              </>
            }
            subtitle="Combos called in your ear — you throw them on the bag. AI catches jab, cross, and hook."
            getStartedLabel="Get started"
            onGetStarted={enterBagFlow}
            onSkip={enterBagFlow}
          />
        )}
        {screen === "home" && (
          <BagHomeScreen
            key="home"
            data={data}
            isPro={pro}
            freeSessionsLeft={isPro() ? null : 5 - freeUsed}
            onStart={handleStartFromHome}
            onProgress={handleProgress}
            onOpenOpponent={handleOpenOpponent}
            onUpgrade={() => setShowUpgrade(true)}
          />
        )}
        {screen === "setup-camera" && (
          <BagSetupCameraScreen
            key="setup-camera"
            initialMode={cameraModeDraft}
            isPro={pro}
            onBack={() => setScreen("home")}
            onContinue={(mode, stance) => {
              setCameraModeDraft(mode);
              setStanceDraft(stance);
              setScreen("calibration");
            }}
            onUpgrade={() => setShowUpgrade(true)}
          />
        )}
        {screen === "calibration" && (
          <BagCalibrationScreen
            key="calibration"
            cameraMode={cameraModeDraft}
            stance={stanceDraft}
            onStanceChange={setStanceDraft}
            onBack={() => setScreen("setup-camera")}
            onComplete={(cal) => {
              setCalibrationDraft(cal);
              setStanceDraft(cal.stance);
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
            onBack={() => setScreen("calibration")}
            onReady={handleReady}
          />
        )}
        {screen === "training" && config && (
          <BagTrainingScreen
            key="training"
            config={config}
            drill={drill}
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
            onTrainAgain={() => setScreen("setup-camera")}
            onStartRecommended={handleStartRecommended}
            onHome={() => {
              refreshData();
              refreshProAndUsage();
              setScreen("home");
            }}
          />
        )}
        {screen === "progress" && (
          <BagProgressScreen
            key="progress"
            data={data}
            onBack={() => {
              refreshData();
              setScreen("home");
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
