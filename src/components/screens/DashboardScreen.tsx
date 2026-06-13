"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getPersonalBests, loadWorkoutHistory } from "@/lib/history";
import { HERO_DASHBOARD_IMAGE, HERO_ONBOARDING_POSTER } from "@/lib/media";
import { hasPreviewedSignals } from "@/lib/storage";
import { SHOW_ADVANCED } from "@/lib/feature-flags";
import { HeroCarousel, type HeroSlide } from "@/components/ui/HeroCarousel";
import { AppTopBar } from "@/components/ui/AppTopBar";
import { MomentumCarousel, type MomentumItem } from "@/components/ui/MomentumCarousel";
import { StartRoundPanel } from "@/components/ui/StartRoundPanel";
import { ProgressWidget } from "@/components/ui/ProgressWidget";
import { DailyChallengeCard } from "@/components/ui/DailyChallengeCard";
import { getDailyChallenge } from "@/lib/daily-challenges";
import { CoreHomeScreen } from "@/components/screens/CoreHomeScreen";
import type { FightStyle } from "@/lib/types";

interface DashboardScreenProps {
  style: FightStyle;
  roundLengthSeconds: number;
  onStyleChange: (style: FightStyle) => void;
  onRoundLengthChange: (seconds: number) => void;
  onStart: () => void;
  onCustomize: () => void;
  onQuickStart: () => void;
  onAdvancedStart: () => void;
  onTrainOpponent: () => void;
  onChallenges: () => void;
  onRecords: () => void;
  onHowItWorks: () => void;
  onWatchIntro: () => void;
  onPro: () => void;
  onDailyChallenge: () => void;
  isPro: boolean;
}

const PATH_ITEMS = [
  {
    id: "workout",
    step: "01",
    title: "First round",
    subtitle: "Solo react — feel the rhythm engine call your moves",
  },
  {
    id: "rhythm",
    step: "02",
    title: "Fight rhythm",
    subtitle: "Femur, counter fighter, Dutch pressure — pick your pace",
  },
  {
    id: "signals",
    step: "03",
    title: "Three moves",
    subtitle: "Attack, defend, move — voice cues every exchange",
  },
  {
    id: "pro",
    step: "04",
    title: "Go Pro",
    subtitle: "Stadium mode, advanced signals, full ambience",
  },
] as const;

export function DashboardScreen(props: DashboardScreenProps) {
  if (!SHOW_ADVANCED) {
    return (
      <CoreHomeScreen
        style={props.style}
        roundLengthSeconds={props.roundLengthSeconds}
        onStyleChange={props.onStyleChange}
        onRoundLengthChange={props.onRoundLengthChange}
        onStart={props.onStart}
        onCustomize={props.onCustomize}
      />
    );
  }

  return <AdvancedDashboard {...props} />;
}

function AdvancedDashboard({
  onQuickStart,
  onAdvancedStart,
  onTrainOpponent,
  onChallenges,
  onRecords,
  onHowItWorks,
  onWatchIntro,
  onPro,
  onDailyChallenge,
  isPro,
}: DashboardScreenProps) {
  const bests = getPersonalBests();
  const history = loadWorkoutHistory();
  const dailyChallenge = getDailyChallenge();

  const signalsPreviewed = hasPreviewedSignals();
  const hasWorkouts = history.length > 0;
  const sessionCount = history.length;

  const doneCount = [
    hasWorkouts,
    hasWorkouts,
    signalsPreviewed,
    isPro,
  ].filter(Boolean).length;

  const heroSlides = useMemo((): HeroSlide[] => {
    const slides: HeroSlide[] = [
      {
        id: "rhythm",
        eyebrow: "Fight rhythm engine",
        title: "Feel the round,\nnot the timer",
        image: HERO_DASHBOARD_IMAGE,
        actions: [
          { label: "Challenges", onClick: onChallenges },
          { label: "Watch intro", onClick: onWatchIntro },
        ],
      },
      {
        id: "react",
        eyebrow: "Solo react",
        title: "Attack. Defend.\nMove.",
        image: HERO_ONBOARDING_POSTER,
        actions: [{ label: "Start round", onClick: onAdvancedStart, primary: true }],
      },
      {
        id: "combos",
        eyebrow: "Combo calls",
        title: "Throw what\nyou hear",
        image: HERO_DASHBOARD_IMAGE,
        actions: [{ label: "Start round", onClick: onAdvancedStart, primary: true }],
      },
    ];

    if (!isPro) {
      slides.push({
        id: "pro",
        eyebrow: "fightflo Pro",
        title: "All rhythms.\nStadium mode.",
        gradient: "bg-gradient-to-br from-[#fa4141]/25 via-[#1a0808] to-[#050505]",
        actions: [{ label: "View Pro", onClick: onPro, primary: true }],
      });
    }

    return slides;
  }, [isPro, onChallenges, onWatchIntro, onAdvancedStart, onPro]);

  const momentumItems = useMemo((): MomentumItem[] => {
    const isDone = (id: string) => {
      if (id === "workout" || id === "rhythm") return hasWorkouts;
      if (id === "signals") return signalsPreviewed;
      if (id === "pro") return isPro;
      return false;
    };

    return PATH_ITEMS.map((item) => {
      const onClick =
        item.id === "workout"
          ? onAdvancedStart
          : item.id === "pro"
            ? onPro
            : item.id === "signals"
              ? onHowItWorks
              : onAdvancedStart;

      return {
        id: item.id,
        step: item.step,
        title: item.title,
        subtitle: item.subtitle,
        done: isDone(item.id),
        onClick,
      };
    });
  }, [hasWorkouts, signalsPreviewed, isPro, onAdvancedStart, onPro, onHowItWorks]);

  return (
    <div className="app-shell relative min-h-dvh bg-black pb-24">
      <header className="relative px-5 pb-2 pt-10">
        <AppTopBar
          trailing={
            <>
              <button
                type="button"
                onClick={onRecords}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] text-[#737373] transition-colors hover:border-white/[0.15] hover:text-white"
                aria-label="Records"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </button>
              {!isPro && (
                <button
                  type="button"
                  onClick={onPro}
                  className="font-display rounded-full border border-[#fa4141]/40 px-3 py-1.5 text-[10px] tracking-[0.14em] text-[#fa4141]"
                >
                  Pro
                </button>
              )}
            </>
          }
        />
      </header>

      <div className="space-y-8 px-5 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <HeroCarousel slides={heroSlides} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <DailyChallengeCard
            challenge={dailyChallenge}
            onStart={onDailyChallenge}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <StartRoundPanel
            sessionCount={sessionCount}
            bestScore={bests.bestScore}
            onQuickStart={onQuickStart}
            onCustomStart={onAdvancedStart}
            onTrainOpponent={onTrainOpponent}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <ProgressWidget onRecords={onRecords} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <MomentumCarousel
            items={momentumItems}
            doneCount={doneCount}
            total={PATH_ITEMS.length}
          />
        </motion.div>
      </div>
    </div>
  );
}
