"use client";

import { FIGHT_STYLES } from "@/lib/constants";
import {
  formatDuration,
  formatWorkoutDate,
  getPersonalBests,
  loadWorkoutHistory,
  clearWorkoutHistory,
  type WorkoutRecord,
} from "@/lib/history";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface RecordsScreenProps {
  onBack: () => void;
}

function styleLabel(style: WorkoutRecord["style"]): string {
  return FIGHT_STYLES.find((s) => s.id === style)?.label ?? style;
}

export function RecordsScreen({ onBack }: RecordsScreenProps) {
  const history = loadWorkoutHistory();
  const bests = getPersonalBests(history);
  const recent = history.slice(0, 12);

  const handleClear = () => {
    if (history.length === 0) return;
    if (confirm("Clear all workout history? This cannot be undone.")) {
      clearWorkoutHistory();
      onBack();
    }
  };

  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader eyebrow="Your progress" title="Records" />

      {history.length === 0 ? (
        <div className="mt-16 flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-display text-3xl text-[#2a2a2a]">No rounds yet</p>
          <p className="mt-3 max-w-xs text-sm text-[#8e9297]">
            Complete a workout to start tracking scores and personal bests.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-2 gap-2">
            {[
              { label: "Best score", value: bests.bestScore, accent: true },
              { label: "Workouts", value: bests.totalWorkouts, accent: false },
              { label: "Stadium best", value: bests.bestStadiumScore || "—", accent: false },
              { label: "Total signals", value: bests.totalSignals, accent: false },
            ].map((stat) => (
              <div key={stat.label} className="nike-card rounded-2xl p-4">
                <p className="label text-[#525252]">{stat.label}</p>
                <p
                  className={`font-display mt-2 text-4xl leading-none ${
                    stat.accent ? "text-[#fa4141]" : "text-white"
                  }`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex-1">
            <p className="label mb-4 text-[#525252]">Recent</p>
            <div className="space-y-2">
              {recent.map((record) => (
                <div
                  key={record.id}
                  className="nike-card flex items-center justify-between rounded-2xl px-4 py-3.5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {record.challengeName ??
                        `${record.workoutMode === "combos" ? "Combos" : "Solo"} · ${styleLabel(record.style)}`}
                    </p>
                    <p className="mt-0.5 text-xs text-[#525252]">
                      {formatWorkoutDate(record.completedAt)} ·{" "}
                      {formatDuration(record.durationSeconds)} ·{" "}
                      {record.roundsCompleted} rounds
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl text-[#fa4141]">
                      {record.reactionScore}
                    </p>
                    <p className="text-[10px] tracking-wider text-[#525252] uppercase">
                      {record.pressureRating}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="mt-6 pb-2 text-center text-xs text-[#525252] transition-colors hover:text-[#8e9297]"
          >
            Clear history
          </button>
        </>
      )}

      {history.length === 0 && (
        <div className="mt-10 pb-2">
          <Button variant="outline" size="md" onClick={onBack}>
            Back
          </Button>
        </div>
      )}
    </ScreenWrapper>
  );
}
