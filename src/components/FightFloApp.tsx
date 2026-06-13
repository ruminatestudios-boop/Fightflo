"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { audioEngine } from "@/lib/audio";
import { cancelCoachVoice, initCoachVoice, unlockCoachAudio } from "@/lib/coach-voice";
import {
  saveSettings,
  loadSettings,
  hasCompletedOnboarding,
  setOnboardingComplete,
  setOnboardingHeroSeen,
  getOpponentSessionUses,
  incrementOpponentSessionUses,
} from "@/lib/storage";
import { hasSeenPaywall, isPro as checkIsPro } from "@/lib/subscription";
import type {
  AppScreen,
  AppSettings,
  ChallengePreset,
  SessionStats,
} from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { useTraining } from "@/hooks/useTraining";
import { LoadingScreen } from "@/components/screens/LoadingScreen";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { StyleSelect } from "@/components/screens/StyleSelect";
import { ModeSelect } from "@/components/screens/ModeSelect";
import { RoundSettingsScreen } from "@/components/screens/RoundSettings";
import { ChallengeSelect } from "@/components/screens/ChallengeSelect";
import { TrainingScreen } from "@/components/screens/TrainingScreen";
import { RestScreen } from "@/components/screens/RestScreen";
import { SummaryScreen } from "@/components/screens/SummaryScreen";
import { PWARegister } from "@/components/PWARegister";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { BottomNav, screenToNavTab } from "@/components/ui/BottomNav";
import { initVoices, setVoiceLanguage } from "@/lib/voice";
import { saveWorkoutRecord } from "@/lib/history";
import { RecordsScreen } from "@/components/screens/RecordsScreen";
import { IntroScreen } from "@/components/screens/IntroScreen";
import { OnboardingScreen } from "@/components/screens/OnboardingScreen";
import { PaywallScreen } from "@/components/screens/PaywallScreen";
import { ProFab } from "@/components/ui/ProFab";
import { WorkoutSelect } from "@/components/screens/WorkoutSelect";
import { CategorySelectScreen } from "@/components/screens/CategorySelectScreen";
import { SessionSetupScreen } from "@/components/screens/SessionSetupScreen";
import { BreathworkScreen } from "@/components/screens/BreathworkScreen";
import { getDailyChallenge } from "@/lib/daily-challenges";
import {
  applyCategoryPreset,
  categoryLabel,
  type SessionDurationId,
  type SessionIntensity,
} from "@/lib/workout-categories";
import { OpponentTrainScreen } from "@/components/screens/OpponentTrainScreen";
import { FREE_OPPONENT_SESSIONS, isOpponentTrainingPro } from "@/lib/pro-gates";
import { getSessionNextStep } from "@/lib/session-recommendations";
import { QUICK_START_SETTINGS, STANDARD_START_SETTINGS } from "@/lib/session-presets";
import { buildRhythmBlueprint, type OpponentSessionPlan } from "@/lib/opponent-planner";
import type { RhythmBlueprint } from "@/lib/types";
import { ensureArchetypeForStyle } from "@/lib/style-discipline";
import {
  freeArchetypeForStyle,
  isCueStylePro,
  isModePro,
  isRhythmArchetypePro,
} from "@/lib/pro-gates";
import { usePro } from "@/hooks/usePro";
import { SHOW_ADVANCED } from "@/lib/feature-flags";
import { buildCoreLoopSettings } from "@/lib/core-loop-presets";
import { STYLE_DEFAULT_ARCHETYPE } from "@/lib/fight-rhythm-engine";

const NAV_SCREENS: AppScreen[] = [
  "home",
  "records",
  "category",
  "session-setup",
  "workout",
  "style",
  "mode",
  "settings",
  "challenges",
  "opponent",
  "paywall",
];

export function FightFloApp() {
  const [screen, setScreen] = useState<AppScreen>(
    SHOW_ADVANCED ? "intro" : "loading"
  );
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [challengeName, setChallengeName] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [restTime, setRestTime] = useState(0);
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [isPersonalBest, setIsPersonalBest] = useState(false);
  const [lastDuration, setLastDuration] = useState(0);
  const [onboardingKey, setOnboardingKey] = useState(0);
  const [sessionCoachCues, setSessionCoachCues] = useState<string[] | null>(null);
  const [lowActivityCoaching, setLowActivityCoaching] = useState<string[] | null>(
    null
  );
  const [restCornerCue, setRestCornerCue] = useState<string | null>(null);
  const [opponentDisplayName, setOpponentDisplayName] = useState<string | null>(
    null
  );
  const [rhythmBlueprint, setRhythmBlueprint] = useState<RhythmBlueprint | null>(
    null
  );
  const [breathworkStarted, setBreathworkStarted] = useState(false);
  const { pro, activatePro, refresh } = usePro();

  const clampSettingsForTier = useCallback(
    (s: AppSettings, isProUser: boolean): AppSettings => {
      let next = {
        ...s,
        rhythmArchetype: ensureArchetypeForStyle(s.style, s.rhythmArchetype),
      };
      if (isProUser) return next;
      if (isModePro(next.mode)) next = { ...next, mode: "hard" };
      if (isCueStylePro(next.cueStyle)) next = { ...next, cueStyle: "clear" };
      if (isRhythmArchetypePro(next.rhythmArchetype)) {
        next = {
          ...next,
          rhythmArchetype: freeArchetypeForStyle(next.style),
          rhythmMode: "default",
        };
      }
      if (next.audio.gymAmbience || next.audio.crowdAmbience || next.audio.trainerClaps) {
        next = {
          ...next,
          audio: {
            ...next.audio,
            gymAmbience: false,
            crowdAmbience: false,
            trainerClaps: false,
          },
        };
      }
      return next;
    },
    []
  );

  useEffect(() => {
    const loaded = loadSettings();
    const base = SHOW_ADVANCED
      ? loaded
      : {
          ...loaded,
          ...buildCoreLoopSettings(
            loaded.style,
            loaded.rounds.roundLength || 120
          ),
        };
    setSettings(clampSettingsForTier(base, checkIsPro()));
    initVoices();

    const train = new URLSearchParams(window.location.search).get("train");
    if (train === "opponent" && SHOW_ADVANCED) {
      setScreen("opponent");
      window.history.replaceState({}, "", "/");
      return;
    }

    if (!SHOW_ADVANCED) {
      const t = setTimeout(() => setScreen("home"), 600);
      return () => clearTimeout(t);
    }
    // SHOW_ADVANCED: intro is already the first screen — no loading splash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSettings((s) => clampSettingsForTier(s, pro));
  }, [pro, clampSettingsForTier]);

  useEffect(() => {
    setVoiceLanguage(settings.language);
  }, [settings.language]);

  const goToPaywall = useCallback(() => setScreen("paywall"), []);

  const finishOnboarding = useCallback(() => {
    setOnboardingComplete();
    if (!hasSeenPaywall()) {
      setScreen("paywall");
    } else {
      setScreen("home");
    }
  }, []);

  const finishPaywall = useCallback(() => {
    refresh();
    setScreen("home");
  }, [refresh]);

  useEffect(() => {
    if (screen !== "loading") {
      saveSettings(settings);
    }
  }, [settings, screen]);

  const handleComplete = useCallback((stats: SessionStats, durationSeconds: number) => {
    cancelCoachVoice();
    audioEngine.stopAmbience();
    const { isPersonalBest: isBest } = saveWorkoutRecord(stats, durationSeconds);
    setIsPersonalBest(isBest);
    setLastDuration(durationSeconds);
    setSessionStats(stats);
    setBreathworkStarted(false);
    setTrainingStarted(false);
    setScreen("summary");
  }, []);

  const handleRestStart = useCallback(() => {
    setRestTime(settings.rounds.restTime);
    setScreen("rest");
  }, [settings.rounds.restTime]);

  const training = useTraining({
    settings,
    challengeName,
    sessionCoachCues,
    lowActivityCoaching,
    fighterDisplayName: opponentDisplayName,
    restCornerCue,
    rhythmBlueprint,
    onComplete: handleComplete,
    onRestStart: handleRestStart,
  });

  useEffect(() => {
    if (screen !== "rest") return;
    const interval = setInterval(() => {
      setRestTime((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  const resumeFromRest = training.resumeFromRest;
  const restPhase = training.phase.phase;

  useEffect(() => {
    if (screen === "rest" && restTime === 0 && restPhase === "rest") {
      resumeFromRest();
      setScreen("training");
    }
  }, [screen, restTime, restPhase, resumeFromRest]);

  const startTraining = async () => {
    await audioEngine.unlock();
    await unlockCoachAudio();
    void initCoachVoice(settings.language);
    setTrainingStarted(true);
    setBreathworkStarted(false);
    setScreen("training");
    training.startCountdown();
  };

  const startCoreLoop = useCallback(() => {
    clearSessionExtras();
    flushSync(() => {
      setSettings((s) =>
        clampSettingsForTier(
          {
            ...s,
            ...buildCoreLoopSettings(s.style, s.rounds.roundLength),
            rounds: {
              ...buildCoreLoopSettings(s.style, s.rounds.roundLength).rounds,
              rounds: s.rounds.rounds,
              restTime: s.rounds.restTime,
            },
          },
          pro
        )
      );
    });
    void startTraining();
  }, [pro, clampSettingsForTier]);

  const handleStyleChange = useCallback(
    (style: AppSettings["style"]) => {
      setSettings((s) =>
        clampSettingsForTier(
          {
            ...s,
            style,
            rhythmArchetype: STYLE_DEFAULT_ARCHETYPE[style],
            rhythmMode: "default",
          },
          pro
        )
      );
    },
    [pro, clampSettingsForTier]
  );

  const handleRoundLengthChange = useCallback((roundLength: number) => {
    setSettings((s) => ({
      ...s,
      rounds: { ...s.rounds, roundLength },
    }));
  }, []);

  const startBreathwork = async () => {
    await audioEngine.unlock();
    await unlockCoachAudio();
    setBreathworkStarted(true);
    setTrainingStarted(false);
    setScreen("breathwork");
  };

  const startCategorySession = (
    intensity: SessionIntensity,
    durationId: SessionDurationId
  ) => {
    clearSessionExtras();
    const preset = applyCategoryPreset(
      settings.trainingCategory,
      intensity,
      durationId,
      settings
    );
    const merged = clampSettingsForTier(preset, pro);
    setSettings(merged);
    setChallengeName(categoryLabel(settings.trainingCategory));

    if (settings.trainingCategory === "breathwork") {
      void startBreathwork();
      return;
    }

    if (settings.trainingCategory !== "fight") {
      setRhythmBlueprint(
        buildRhythmBlueprint(
          merged.rhythmArchetype,
          merged.rhythmMode,
          categoryLabel(settings.trainingCategory)
        )
      );
    }

    void startTraining();
  };

  const handleCategoryNext = () => {
    if (settings.trainingCategory === "fight") {
      setScreen("workout");
      return;
    }
    setScreen("session-setup");
  };

  const applyDailyChallenge = () => {
    const daily = getDailyChallenge();
    applyChallenge({
      ...daily.preset,
      name: daily.name,
    });
  };

  const startQuickSession = async () => {
    clearSessionExtras();
    setSettings((s) =>
      clampSettingsForTier({ ...s, ...QUICK_START_SETTINGS }, pro)
    );
    await startTraining();
  };

  const startStandardSession = async () => {
    clearSessionExtras();
    setSettings((s) =>
      clampSettingsForTier({ ...s, ...STANDARD_START_SETTINGS }, pro)
    );
    await startTraining();
  };

  const clearSessionExtras = () => {
    setSessionCoachCues(null);
    setLowActivityCoaching(null);
    setRestCornerCue(null);
    setOpponentDisplayName(null);
    setRhythmBlueprint(null);
    setChallengeName(null);
  };

  const applyOpponentPlan = (plan: OpponentSessionPlan) => {
    if (!pro && isOpponentTrainingPro(getOpponentSessionUses())) {
      goToPaywall();
      return;
    }
    incrementOpponentSessionUses();
    const merged = clampSettingsForTier(
      {
        ...settings,
        ...plan.session,
        lastChallengeId: null,
      },
      pro
    );
    setSettings(merged);
    setChallengeName(`vs ${plan.displayName}`);
    setOpponentDisplayName(plan.displayName);
    setSessionCoachCues(plan.sessionCoachCues);
    setLowActivityCoaching(plan.lowActivityCoaching);
    setRestCornerCue(plan.restCue);
    setRhythmBlueprint(plan.rhythmBlueprint);
    startTraining();
  };

  const applyChallenge = (challenge: ChallengePreset) => {
    setSessionCoachCues(null);
    setLowActivityCoaching(null);
    setRestCornerCue(null);
    const archetype =
      challenge.rhythmArchetype ??
      STYLE_DEFAULT_ARCHETYPE[challenge.style];
    const rhythmMode = challenge.rhythmMode ?? "default";
    setRhythmBlueprint(
      buildRhythmBlueprint(archetype, rhythmMode, challenge.name)
    );
    setSettings((s) => ({
      ...s,
      style: challenge.style,
      mode: challenge.mode,
      rounds: challenge.rounds,
      rhythmArchetype:
        challenge.rhythmArchetype ??
        STYLE_DEFAULT_ARCHETYPE[challenge.style],
      rhythmMode: challenge.rhythmMode ?? "default",
      lastChallengeId: challenge.id,
    }));
    setChallengeName(challenge.name);
    startTraining();
  };

  const handleStop = () => {
    training.stopTraining();
    setTrainingStarted(false);
    clearSessionExtras();
    setScreen("home");
  };

  const modeLabel =
    settings.mode === "stadium"
      ? "STADIUM MODE"
      : settings.mode === "hard"
        ? "HARD MODE"
        : "EASY MODE";

  const showAmbient =
    SHOW_ADVANCED &&
    !["loading", "training", "rest", "breathwork", "onboarding", "intro"].includes(screen);
  const showNav = SHOW_ADVANCED && NAV_SCREENS.includes(screen);
  const navTab = screenToNavTab(screen);

  const openOnboarding = useCallback(() => {
    setOnboardingKey((k) => k + 1);
    setScreen("onboarding");
  }, []);

  const openIntroHero = useCallback(() => {
    setScreen("intro");
  }, []);

  const handleGetStarted = useCallback(() => {
    setOnboardingHeroSeen();
    if (!hasCompletedOnboarding()) {
      setOnboardingKey((k) => k + 1);
      setScreen("onboarding");
      return;
    }
    if (!hasSeenPaywall() && !checkIsPro()) {
      setScreen("paywall");
      return;
    }
    setScreen("home");
  }, []);

  return (
    <div className="relative min-h-dvh bg-black text-white">
      <PWARegister />
      {showAmbient && <AmbientBackground />}
      <AnimatePresence mode="wait">
        {screen === "loading" && <LoadingScreen key="loading" />}

        {SHOW_ADVANCED && screen === "intro" && (
          <IntroScreen
            key="intro"
            onGetStarted={handleGetStarted}
          />
        )}

        {SHOW_ADVANCED && screen === "onboarding" && (
          <OnboardingScreen
            key={`onboarding-${onboardingKey}`}
            onGoToPaywall={() => {
              setOnboardingComplete();
              setScreen("paywall");
            }}
          />
        )}

        {SHOW_ADVANCED && screen === "paywall" && (
          <PaywallScreen
            key="paywall"
            onClose={finishPaywall}
            onSubscribed={activatePro}
            isPro={pro}
            showClose
          />
        )}

        {screen === "home" && (
          <DashboardScreen
            key="home"
            style={settings.style}
            roundLengthSeconds={settings.rounds.roundLength}
            onStyleChange={handleStyleChange}
            onRoundLengthChange={handleRoundLengthChange}
            onStart={startCoreLoop}
            onCustomize={() => setScreen("settings")}
            isPro={pro}
            onQuickStart={() => void startQuickSession()}
            onAdvancedStart={() => {
              clearSessionExtras();
              setScreen("category");
            }}
            onDailyChallenge={() => applyDailyChallenge()}
            onTrainOpponent={() => {
              if (!pro && isOpponentTrainingPro(getOpponentSessionUses())) {
                goToPaywall();
                return;
              }
              setScreen("opponent");
            }}
            onChallenges={() => setScreen("challenges")}
            onRecords={() => setScreen("records")}
            onHowItWorks={openOnboarding}
            onWatchIntro={openIntroHero}
            onPro={goToPaywall}
          />
        )}

        {SHOW_ADVANCED && screen === "records" && (
          <RecordsScreen key="records" onBack={() => setScreen("home")} />
        )}

        {SHOW_ADVANCED && screen === "opponent" && (
          <OpponentTrainScreen
            key="opponent"
            isPro={pro}
            freeSessionsLeft={Math.max(
              0,
              FREE_OPPONENT_SESSIONS - getOpponentSessionUses()
            )}
            onBack={() => setScreen("home")}
            onStart={applyOpponentPlan}
            onPro={goToPaywall}
          />
        )}

        {SHOW_ADVANCED && screen === "category" && (
          <CategorySelectScreen
            key="category"
            selected={settings.trainingCategory}
            onSelect={(trainingCategory) =>
              setSettings((s) => ({ ...s, trainingCategory }))
            }
            onNext={handleCategoryNext}
            onBack={() => setScreen("home")}
          />
        )}

        {SHOW_ADVANCED && screen === "session-setup" && (
          <SessionSetupScreen
            key="session-setup"
            category={settings.trainingCategory}
            onStart={startCategorySession}
            onBack={() => setScreen("category")}
          />
        )}

        {SHOW_ADVANCED && screen === "workout" && (
          <WorkoutSelect
            key="workout"
            selected={settings.workoutMode}
            onSelect={(workoutMode) => setSettings((s) => ({ ...s, workoutMode }))}
            onNext={() => setScreen("style")}
            onBack={() => setScreen("category")}
          />
        )}

        {SHOW_ADVANCED && screen === "style" && (
          <StyleSelect
            key="style"
            selected={settings.style}
            workoutMode={settings.workoutMode}
            onSelect={(style) =>
              setSettings((s) =>
                clampSettingsForTier(
                  {
                    ...s,
                    style,
                    rhythmArchetype: STYLE_DEFAULT_ARCHETYPE[style],
                    rhythmMode: "default",
                  },
                  pro
                )
              )
            }
            onNext={() => setScreen("mode")}
            onBack={() => setScreen("workout")}
          />
        )}

        {SHOW_ADVANCED && screen === "mode" && (
          <ModeSelect
            key="mode"
            selected={settings.mode}
            onSelect={(mode) => setSettings((s) => ({ ...s, mode }))}
            onNext={() => setScreen("settings")}
            onBack={() => setScreen("style")}
            isPro={pro}
            onUpgrade={goToPaywall}
          />
        )}

        {screen === "settings" && (
          <RoundSettingsScreen
            key="settings"
            settings={settings}
            onChange={setSettings}
            customizeOnly={!SHOW_ADVANCED}
            onStart={() => {
              clearSessionExtras();
              if (SHOW_ADVANCED) {
                void startTraining();
              } else {
                setScreen("home");
              }
            }}
            onBack={() => setScreen(SHOW_ADVANCED ? "mode" : "home")}
            isPro={pro}
            onUpgrade={goToPaywall}
          />
        )}

        {SHOW_ADVANCED && screen === "challenges" && (
          <ChallengeSelect
            key="challenges"
            onSelect={applyChallenge}
            onBack={() => setScreen("home")}
            isPro={pro}
            onUpgrade={goToPaywall}
          />
        )}

        {screen === "training" && trainingStarted && (
          <TrainingScreen
            key="training"
            phase={training.phase}
            countdownValue={training.countdownValue}
            totalRounds={settings.rounds.rounds}
            roundLength={settings.rounds.roundLength}
            cueStyle={settings.cueStyle}
            workoutMode={settings.workoutMode}
            isPaused={training.isPaused}
            onPause={training.pauseTraining}
            onResume={training.resumeTraining}
            onStop={handleStop}
          />
        )}

        {SHOW_ADVANCED && screen === "breathwork" && breathworkStarted && (
          <BreathworkScreen
            key="breathwork"
            durationSeconds={settings.rounds.roundLength}
            onComplete={handleComplete}
            onStop={() => {
              cancelCoachVoice();
              audioEngine.stopAmbience();
              setBreathworkStarted(false);
              setScreen("home");
            }}
          />
        )}

        {(screen === "rest" || training.phase.phase === "rest") && trainingStarted && (
          <RestScreen
            key="rest"
            timeRemaining={restTime}
            restDuration={settings.rounds.restTime}
            nextRound={training.phase.currentRound}
            totalRounds={settings.rounds.rounds}
            cornerCue={training.phase.restCornerCue}
            onSkip={() => {
              setRestTime(0);
              training.resumeFromRest();
              setScreen("training");
            }}
            onStop={handleStop}
          />
        )}

        {screen === "summary" && sessionStats && (
          <SummaryScreen
            key="summary"
            stats={sessionStats}
            isPersonalBest={isPersonalBest}
            durationSeconds={lastDuration}
            nextStep={getSessionNextStep(sessionStats, pro)}
            onAgain={() => {
              setSessionStats(null);
              if (SHOW_ADVANCED) {
                void startTraining();
              } else {
                startCoreLoop();
              }
            }}
            onHome={() => {
              setSessionStats(null);
              setIsPersonalBest(false);
              clearSessionExtras();
              setScreen("home");
            }}
            onRecords={() => {
              setSessionStats(null);
              setIsPersonalBest(false);
              setScreen("records");
            }}
            onNextStep={() => {
              const step = getSessionNextStep(sessionStats, pro);
              setSessionStats(null);
              setIsPersonalBest(false);
              if (step.action === "opponent") {
                if (!pro && isOpponentTrainingPro(getOpponentSessionUses())) {
                  goToPaywall();
                } else {
                  setScreen("opponent");
                }
              } else if (step.action === "pro") {
                goToPaywall();
              } else if (step.action === "harder") {
                void startStandardSession();
              } else if (step.action === "quick") {
                void startQuickSession();
              } else {
                clearSessionExtras();
                setScreen("home");
              }
            }}
          />
        )}
      </AnimatePresence>

      {showNav && navTab && (
        <BottomNav
          active={navTab}
          highlightPro={!pro}
          onHome={() => setScreen("home")}
          onTrain={() => {
            clearSessionExtras();
            setScreen("category");
          }}
          onChallenges={() => setScreen("challenges")}
          onPro={goToPaywall}
        />
      )}

      {SHOW_ADVANCED && (
        <ProFab
          onClick={goToPaywall}
          hidden={
            pro ||
            screen === "intro" ||
            screen === "paywall" ||
            screen === "training" ||
            screen === "rest" ||
            screen === "breathwork" ||
            screen === "loading"
          }
        />
      )}
    </div>
  );
}
