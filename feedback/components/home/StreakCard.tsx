"use client";

import { useEffect, useState } from "react";
import { apiPath } from "@/lib/paths";
import type { StreakInsight } from "@/lib/insights/streak";

/** Real streak — fetched from actual session activity, not decorative. */
export function StreakCard() {
  const [streak, setStreak] = useState<StreakInsight | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("feedback_anon_user_id");
    if (!userId) return;

    fetch(apiPath(`/api/streak?userId=${encodeURIComponent(userId)}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StreakInsight | null) => setStreak(data))
      .catch(() => undefined);
  }, []);

  if (!streak || streak.currentStreak === 0) return null;

  return (
    <div className="streak-card">
      <div className="streak-card-top">
        <div className="streak-card-count">
          <span className="streak-card-flame" aria-hidden>
            🔥
          </span>
          <span className="streak-card-number">{streak.currentStreak}</span>
        </div>
        <div className="streak-card-copy">
          <p className="streak-card-title">Day streak</p>
          <p className="streak-card-subtitle">
            {streak.trainedToday
              ? "Trained today — keep it going."
              : "Train today to keep your streak."}
          </p>
        </div>
      </div>

      <div className="streak-card-week">
        {streak.week.map((day) => (
          <div key={day.date} className="streak-card-day">
            <span className="streak-card-day-label">{day.label}</span>
            <span
              className={`streak-card-day-dot${day.active ? " streak-card-day-dot--active" : ""}${
                day.isToday ? " streak-card-day-dot--today" : ""
              }`}
              aria-hidden
            >
              {day.active ? "🔥" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
