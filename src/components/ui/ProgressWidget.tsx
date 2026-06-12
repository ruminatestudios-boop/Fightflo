"use client";

import { computeProgressSnapshot } from "@/lib/progress";

interface ProgressWidgetProps {
  onRecords?: () => void;
}

export function ProgressWidget({ onRecords }: ProgressWidgetProps) {
  const progress = computeProgressSnapshot();
  const weekPct = Math.min(100, (progress.sessionsThisWeek / progress.weekGoal) * 100);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label text-[#525252]">Your momentum</p>
          {progress.streakDays > 0 ? (
            <p className="font-display mt-1 text-2xl text-white">
              {progress.streakDays} day streak
            </p>
          ) : (
            <p className="font-display mt-1 text-2xl text-white">Start your streak</p>
          )}
        </div>
        {onRecords && (
          <button
            type="button"
            onClick={onRecords}
            className="text-xs text-[#737373] hover:text-white"
          >
            Records
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#525252]">This week</p>
          <p className="mt-1 font-display text-xl text-white">
            {progress.weeklySessions}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#525252]">Best score</p>
          <p className="mt-1 font-display text-xl text-[#fa4141]">
            {progress.bestReactionScore || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#525252]">Total time</p>
          <p className="mt-1 font-display text-xl text-white">
            {progress.totalTrainingLabel}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-[10px] text-[#525252]">
          <span>Weekly consistency</span>
          <span>
            {progress.sessionsThisWeek}/{progress.weekGoal} sessions
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[#fa4141] transition-all duration-500"
            style={{ width: `${weekPct}%` }}
          />
        </div>
      </div>

      {progress.hardestModeSurvived === "stadium" && (
        <p className="mt-4 text-xs text-[#737373]">Survived Stadium Mode</p>
      )}
    </div>
  );
}
