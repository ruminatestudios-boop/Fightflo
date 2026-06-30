"use client";

import { useEffect, useState } from "react";
import { apiPath } from "@/lib/paths";
import { computeStreak, type StreakInsight } from "@/lib/insights/streak";
import { FlowPanel } from "@/components/home/FlowShell";

interface StreakCardProps {
  /** Show on progress tab even when streak is 0 */
  showWhenEmpty?: boolean;
}

function isStreakPreview(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    process.env.NODE_ENV === "development" &&
    (params.get("preview") === "streak" || params.get("preview") === "progress")
  );
}

function previewStreakInsight(): StreakInsight {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return computeStreak(keys, now);
}

/** Real streak — fetched from actual session activity, not decorative. */
export function StreakCard({ showWhenEmpty = false }: StreakCardProps) {
  const [streak, setStreak] = useState<StreakInsight | null>(null);

  useEffect(() => {
    if (isStreakPreview()) {
      setStreak(previewStreakInsight());
      return;
    }

    const userId = localStorage.getItem("feedback_anon_user_id");
    if (!userId) return;

    fetch(apiPath(`/api/streak?userId=${encodeURIComponent(userId)}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StreakInsight | null) => setStreak(data))
      .catch(() => undefined);
  }, []);

  if (!streak) return null;
  if (!showWhenEmpty && streak.currentStreak === 0) return null;

  const subtitle =
    streak.currentStreak === 0
      ? "Train today to start your streak."
      : streak.trainedToday
        ? "Trained today — keep it going."
        : "Train today to keep your streak.";

  return (
    <FlowPanel className="streak-panel">
      <p className="home-flow-label">Training streak</p>

      <div className="streak-panel-header">
        <p className="streak-panel-count" aria-label={`${streak.currentStreak} day streak`}>
          <span className="streak-panel-count-value">{streak.currentStreak}</span>
          <span className="streak-panel-count-unit">
            day{streak.currentStreak === 1 ? "" : "s"}
          </span>
        </p>
        <p className="streak-panel-subtitle">{subtitle}</p>
      </div>

      <div className="streak-panel-week" aria-label="This week">
        {streak.week.map((day) => (
          <div key={day.date} className="streak-panel-day">
            <span className="streak-panel-day-label">{day.label}</span>
            <span
              className={`streak-panel-day-mark${
                day.active ? " streak-panel-day-mark--active" : ""
              }${day.isToday ? " streak-panel-day-mark--today" : ""}`}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </FlowPanel>
  );
}
