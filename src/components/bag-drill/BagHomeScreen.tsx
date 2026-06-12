"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { BagScreenWrapper } from "@/components/bag-drill/BagScreenWrapper";
import { BagStatCard, chipClass } from "@/components/bag-drill/bag-ui";
import type { BagDrillMode, FightFloBagData } from "@/lib/bag-drill/types";
import {
  getLastSession,
  getTrainingNudge,
  topWeaknessMessage,
} from "@/lib/bag-drill/storage";
import {
  getWeeklyPlanForToday,
  getWeekRitualStrip,
  type WeeklyPlanDay,
} from "@/lib/bag-drill/weekly-plan";
interface BagHomeScreenProps {
  data: FightFloBagData;
  isPro?: boolean;
  freeSessionsLeft?: number | null;
  onStart: (mode: BagDrillMode, plan?: WeeklyPlanDay) => void;
  onProgress: () => void;
  onOpenOpponent?: () => void;
  onUpgrade?: () => void;
}

const DRILL_MODES: {
  id: BagDrillMode;
  label: string;
  subtitle: string;
}[] = [
  {
    id: "combo",
    label: "Combo drill",
    subtitle: "Called sequences · scored accuracy",
  },
  {
    id: "flurry",
    label: "Punch flurry",
    subtitle: "30s max punches · mic counted",
  },
];

export function BagHomeScreen({
  data,
  isPro: isProUser = false,
  freeSessionsLeft = null,
  onStart,
  onProgress,
  onOpenOpponent,
  onUpgrade,
}: BagHomeScreenProps) {
  const last = getLastSession(data);
  const weakness = topWeaknessMessage(data, 1);
  const hasHistory = data.sessions.length > 0;
  const todayPlan = getWeeklyPlanForToday(data);
  const ritualStrip = getWeekRitualStrip(data);
  const nudge = getTrainingNudge(data);
  const streak = data.allTimeStats.currentStreak;
  const freezes = data.userMeta?.streakFreezes ?? 0;

  const handlePlanStart = (plan: WeeklyPlanDay) => {
    if (plan.action === "open-opponent") {
      onOpenOpponent?.();
      return;
    }
    onStart(plan.drillMode, plan);
  };

  return (
    <BagScreenWrapper className="overflow-y-auto pb-10">
      <div className="flex min-h-0 flex-1 flex-col">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="label text-[#525252]">Heavy bag</p>
          <h1 className="font-display mt-2 text-[2.25rem] leading-tight tracking-wide text-white">
            Call. Throw. Score.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#737373]">
            Combos called in your ear — you throw them on the bag. AI catches
            jab, cross, and hook. Every hit timed. Slow hands don&apos;t hide.
          </p>
          {!isProUser && freeSessionsLeft != null && (
            <p className="mt-3 text-xs text-white/45">
              {freeSessionsLeft > 0
                ? `${freeSessionsLeft} free combo session${freeSessionsLeft === 1 ? "" : "s"} left today`
                : "Free sessions used today — "}
              {freeSessionsLeft <= 0 && onUpgrade && (
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="text-[#fa4141] underline-offset-2 hover:underline"
                >
                  Go Pro
                </button>
              )}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.4 }}
          className="nike-card mt-8 rounded-xl p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label text-[#fa4141]">This week&apos;s plan</p>
              <p className="font-display mt-1 text-lg text-white">
                Today: {todayPlan.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#737373]">
                {todayPlan.detail}
              </p>
            </div>
            {streak > 0 && (
              <div className="shrink-0 text-right">
                <p className="font-display text-2xl text-[#fa4141]">{streak}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  day streak
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {ritualStrip.map((day) => {
              const isToday = day.id === todayPlan.id;
              return (
                <div
                  key={day.id}
                  className={`flex-1 rounded-lg border px-2 py-2 text-center ${
                    isToday
                      ? "border-[#fa4141]/40 bg-[#fa4141]/10"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-white/40">
                    {day.dayLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-white/70">
                    {day.title.split(" ")[0]}
                  </p>
                </div>
              );
            })}
          </div>

          <Button
            variant="secondary"
            size="md"
            className="mt-4 w-full"
            onClick={() => handlePlanStart(todayPlan)}
          >
            Start today&apos;s workout
          </Button>

          {nudge && (
            <p className="mt-3 text-center text-xs text-white/45">{nudge}</p>
          )}

          {isProUser && freezes > 0 && (
            <p className="mt-2 text-center text-[10px] text-white/35">
              {freezes} streak freeze{freezes === 1 ? "" : "s"} available (Pro)
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="mt-8"
        >
          <p className="label mb-2 text-[#525252]">Or pick a mode</p>
          <div className="flex gap-2">
            {DRILL_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onStart(m.id)}
                className={`flex-1 rounded-xl border px-3 py-4 text-left transition-colors ${chipClass(false)} hover:border-white/20`}
              >
                <span className="font-display text-sm text-white">{m.label}</span>
                <span className="mt-1 block text-[10px] normal-case tracking-normal text-[#737373]">
                  {m.subtitle}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {hasHistory && last && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mt-8"
          >
            <p className="label mb-3 text-[#525252]">Last session</p>
            <div className="grid grid-cols-3 gap-2">
              <BagStatCard
                label={last.sessionType === "flurry" ? "Flurry" : "Punches"}
                value={
                  last.sessionType === "flurry"
                    ? `${last.totalPunches}/${last.flurrySeconds ?? 30}s`
                    : String(last.totalPunches)
                }
              />
              <BagStatCard
                label={last.sessionType === "flurry" ? "Rate" : "Avg"}
                value={
                  last.sessionType === "flurry"
                    ? `${(last.totalPunches / Math.max(1, last.duration)).toFixed(1)}/s`
                    : `${last.avgReactionTime}s`
                }
              />
              <BagStatCard label="Streak" value={String(streak)} accent />
            </div>
            {weakness && last.sessionType !== "flurry" && (
              <p className="mt-4 text-sm text-[#fa4141]/90">
                Work on: {weakness.replace("You are slowest on: ", "")}
              </p>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
          className="mt-10 space-y-3"
        >
          {hasHistory && (
            <Button variant="ghost" size="md" onClick={onProgress}>
              {isProUser ? "30-day progress" : "30-day progress (Pro)"}
            </Button>
          )}
        </motion.div>
      </div>
    </BagScreenWrapper>
  );
}
