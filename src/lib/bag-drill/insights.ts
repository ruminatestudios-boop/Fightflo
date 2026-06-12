import { topWeaknesses, averageReactionTime } from "./weakness";
import type {
  BagDrillMode,
  BagSessionRecord,
  BagTrainingConfig,
  FightFloBagData,
} from "./types";
import { getSessionsLast30Days, getBestFlurryForDuration } from "./storage";
import { defaultTiming } from "./timing-presets";

export interface SessionInsight {
  headline: string;
  detail: string;
}

export interface NextSessionRecommendation {
  title: string;
  detail: string;
  config: Partial<BagTrainingConfig>;
}

function comboLabelContainsHook(label: string): boolean {
  return /hook/i.test(label);
}

export function getSessionInsight(
  session: BagSessionRecord,
  data: FightFloBagData
): SessionInsight {
  if (session.sessionType === "flurry") {
    const dur = session.flurrySeconds ?? 30;
    const best = getBestFlurryForDuration(data, dur);
    const rate = session.duration > 0 ? session.totalPunches / session.duration : 0;
    if (session.flurryPersonalBest) {
      return {
        headline: "New personal best",
        detail: `${session.totalPunches} punches in ${dur}s (${rate.toFixed(1)}/sec).`,
      };
    }
    if (best != null && session.totalPunches < best) {
      return {
        headline: `${best - session.totalPunches} punches from your best`,
        detail: `Your ${dur}s record is ${best}. Push the pace next round.`,
      };
    }
    return {
      headline: `${session.totalPunches} punches in ${dur}s`,
      detail: `Average ${rate.toFixed(1)} punches per second.`,
    };
  }

  const prevSessions = data.sessions.filter(
    (s) => s !== session && s.sessionType !== "flurry"
  );
  const prev = prevSessions[prevSessions.length - 1];

  if (prev && session.avgReactionTime > 0 && prev.avgReactionTime > 0) {
    const delta = session.avgReactionTime - prev.avgReactionTime;
    if (Math.abs(delta) >= 0.05) {
      const faster = delta < 0;
      return {
        headline: faster
          ? `${Math.abs(delta).toFixed(2)}s faster on average`
          : `${Math.abs(delta).toFixed(2)}s slower on average`,
        detail: faster
          ? "Reaction time improved vs your last combo session."
          : "Pace dipped — shorten rest or run weakness drill tomorrow.",
      };
    }
  }

  const hookTimes: number[] = [];
  const otherTimes: number[] = [];
  for (const [combo, times] of Object.entries(session.comboReactions)) {
    const avg = averageReactionTime(times);
    if (comboLabelContainsHook(combo)) hookTimes.push(avg);
    else otherTimes.push(...times);
  }

  if (hookTimes.length > 0 && otherTimes.length > 0) {
    const hookAvg = hookTimes.reduce((a, b) => a + b, 0) / hookTimes.length;
    const otherAvg = otherTimes.reduce((a, b) => a + b, 0) / otherTimes.length;
    const gap = hookAvg - otherAvg;
    if (gap >= 0.15) {
      return {
        headline: `${gap.toFixed(2)}s slower on hooks`,
        detail: "Hook combos are costing you reaction time vs straights.",
      };
    }
  }

  if (session.weaknesses.length > 0) {
    return {
      headline: `Slowest: ${session.weaknesses[0]}`,
      detail:
        session.weaknesses.length > 1
          ? `Also work: ${session.weaknesses.slice(1).join(", ")}`
          : "We’ll call this more in weakness drills.",
    };
  }

  if (session.accuracyPercent >= 90) {
    return {
      headline: "Clean round",
      detail: `${session.accuracyPercent}% combo accuracy — step up difficulty.`,
    };
  }

  return {
    headline: `${session.accuracyPercent}% accuracy`,
    detail: "Keep hands up and wait for the call before you throw.",
  };
}

export function getNextSessionRecommendation(
  session: BagSessionRecord,
  data: FightFloBagData
): NextSessionRecommendation {
  if (session.sessionType === "flurry") {
    return {
      title: "Combo drill — 5 min",
      detail: "Switch to called combos to work technique after volume.",
      config: {
        drillMode: "combo",
        difficulty: "fighter",
        timing: { ...defaultTiming("fighter"), durationSeconds: 300 },
        weaknessFocus: false,
      },
    };
  }

  const tops = topWeaknesses(data.weaknesses, 1);
  const top = tops[0] ?? session.weaknesses[0];

  if (top && comboLabelContainsHook(top)) {
    return {
      title: "Tomorrow: hook-heavy block",
      detail: `5 min focused on hooks — starting with ${top}.`,
      config: {
        drillMode: "combo",
        difficulty: "fighter",
        weaknessFocus: true,
        timing: { ...defaultTiming("fighter"), durationSeconds: 300 },
      },
    };
  }

  if (top) {
    return {
      title: "Tomorrow: weakness drill",
      detail: `5 min on ${top} and your other slow combos.`,
      config: {
        drillMode: "combo",
        difficulty: "fighter",
        weaknessFocus: true,
        timing: { ...defaultTiming("fighter"), durationSeconds: 300 },
      },
    };
  }

  if (session.accuracyPercent >= 85) {
    return {
      title: "Try a 30s flurry",
      detail: "Test max output after a clean combo round.",
      config: {
        drillMode: "flurry" as BagDrillMode,
        flurrySeconds: 30,
        difficulty: "fighter",
      },
    };
  }

  return {
    title: "Same again — 10 min",
    detail: "Build consistency before you add speed.",
    config: {
      drillMode: "combo",
      difficulty: session.difficulty,
      timing: defaultTiming(session.difficulty),
    },
  };
}

export function getAccuracyTrend30d(
  data: FightFloBagData
): { label: string; accuracy: number }[] {
  return getSessionsLast30Days(data)
    .filter((s) => s.sessionType !== "flurry")
    .map((s, i) => ({
      label: `S${i + 1}`,
      accuracy: s.accuracyPercent,
    }));
}

export function getReactionTrend30d(
  data: FightFloBagData
): { label: string; avg: number }[] {
  return getSessionsLast30Days(data)
    .filter((s) => s.sessionType !== "flurry" && s.avgReactionTime > 0)
    .map((s, i) => ({
      label: `S${i + 1}`,
      avg: s.avgReactionTime,
    }));
}
