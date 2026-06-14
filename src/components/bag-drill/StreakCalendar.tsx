"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { FightFloBagData } from "@/lib/bag-drill/types";
import {
  activeDaysInMonth,
  buildMonthGrid,
  computeWeekStreak,
  getDayLabels,
  monthLabel,
  sessionDatesSet,
  shiftMonth,
  weekRowActive,
} from "@/lib/bag-drill/streak-calendar";

interface StreakCalendarProps {
  data: FightFloBagData;
  compact?: boolean;
}

function GloveIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 11.5V8.5a3 3 0 016 0v3M7 11.5h10a2 2 0 012 2v4.5a3 3 0 01-3 3H8a3 3 0 01-3-3v-4.5a2 2 0 012-2z"
      />
      <path strokeLinecap="round" d="M9 8.5V7a1.5 1.5 0 013 0v1.5" />
    </svg>
  );
}

function FlameBadge({ count }: { count: number }) {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <svg viewBox="0 0 48 56" className="h-14 w-12" aria-hidden>
        <path
          fill="#fa4141"
          d="M24 4c2 8 10 12 10 22a10 10 0 11-20 0c0-6 4-10 6-14 2 4 2 8 4 8s2-8 0-16z"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center pt-2 font-mono text-lg font-medium text-black">
        {count}
      </span>
    </div>
  );
}

export function StreakCalendar({ data, compact = false }: StreakCalendarProps) {
  const now = new Date();
  const [view, setView] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const activeDates = useMemo(() => sessionDatesSet(data), [data]);
  const weeks = useMemo(
    () => buildMonthGrid(view.year, view.month, activeDates, now),
    [view.year, view.month, activeDates]
  );

  const dayStreak = data.allTimeStats.currentStreak;
  const weekStreak = useMemo(() => computeWeekStreak(activeDates, now), [activeDates]);
  const monthActivities = activeDaysInMonth(activeDates, view.year, view.month);
  const streakDisplay = weekStreak > 0 ? `${weekStreak} Week${weekStreak === 1 ? "" : "s"}` : `${dayStreak} Day${dayStreak === 1 ? "" : "s"}`;

  const canGoForward =
    view.year < now.getFullYear() ||
    (view.year === now.getFullYear() && view.month < now.getMonth());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={compact ? "" : "mt-2"}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.65rem] leading-tight tracking-wide text-white">
            {monthLabel(view.year, view.month)}
          </h2>
          <div className={`mt-4 flex ${compact ? "gap-6" : "gap-10"}`}>
            <div>
              <p className="text-sm text-white/55">Your Streak</p>
              <p className="mt-1 font-display text-2xl text-white">{streakDisplay}</p>
            </div>
            <div>
              <p className="text-sm text-white/55">Streak Activities</p>
              <p className="mt-1 font-display text-2xl text-white">{monthActivities}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 pt-1">
          <button
            type="button"
            onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:bg-white/5 hover:text-white"
            aria-label="Previous month"
          >
            ‹
          </button>
          {canGoForward && (
            <button
              type="button"
              onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:bg-white/5 hover:text-white"
              aria-label="Next month"
            >
              ›
            </button>
          )}
        </div>
      </div>

      <div className={`mt-6 flex gap-3 ${compact ? "gap-2" : "gap-4"}`}>
        <div className="min-w-0 flex-1">
          <div className="mb-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-white/35">
            {getDayLabels().map((label, i) => (
              <span key={`${label}-${i}`}>{label}</span>
            ))}
          </div>

          <div className="space-y-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((cell) => {
                  if (cell.isActive) {
                    return (
                      <div
                        key={cell.date}
                        className="flex aspect-square items-center justify-center"
                      >
                        <div
                          className={`flex items-center justify-center rounded-xl bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ${
                            compact ? "h-9 w-9" : "h-11 w-11"
                          }`}
                        >
                          <GloveIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cell.date ?? `pad-${wi}-${cell.day}`}
                      className="flex aspect-square items-center justify-center"
                    >
                      <span
                        className={`font-mono text-sm ${
                          cell.inMonth
                            ? cell.isFuture
                              ? "text-white/15"
                              : "text-white/30"
                            : "text-white/18"
                        }`}
                      >
                        {cell.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div
          className={`flex shrink-0 flex-col items-center rounded-[2rem] bg-gradient-to-b from-[#6b2d18] via-[#4a1f12] to-[#2d1209] px-2 py-3 ${
            compact ? "w-11" : "w-14"
          }`}
        >
          <div className="flex flex-1 flex-col items-center justify-around gap-2 py-1">
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className={`flex h-8 items-center justify-center ${compact ? "h-7" : "h-9"}`}
              >
                {weekRowActive(week) ? (
                  <span
                    className={`flex items-center justify-center rounded-xl bg-[#fa4141] text-white ${
                      compact ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs"
                    }`}
                  >
                    ✓
                  </span>
                ) : (
                  <span className="h-6 w-6" aria-hidden />
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 shrink-0 pb-1">
            <FlameBadge count={dayStreak > 0 ? dayStreak : weekStreak} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
