import { topWeaknesses } from "./weakness";
import type { BagDrillMode, BagTrainingConfig, FightFloBagData } from "./types";
import { defaultTiming } from "./timing-presets";

export type WeeklyPlanAction =
  | "start-bag"
  | "open-opponent"
  | "open-challenges";

export interface WeeklyPlanDay {
  id: string;
  dayLabel: string;
  title: string;
  detail: string;
  action: WeeklyPlanAction;
  drillMode: BagDrillMode;
  weaknessFocus?: boolean;
  difficulty?: BagTrainingConfig["difficulty"];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weaknessSummary(data: FightFloBagData): string {
  const tops = topWeaknesses(data.weaknesses, 3);
  if (tops.length === 0) return "your slowest combos from past sessions";
  return tops.join(", ");
}

export function getWeeklyPlanForToday(data: FightFloBagData): WeeklyPlanDay {
  const dow = new Date().getDay();
  const weak = weaknessSummary(data);

  if (dow === 1) {
    return {
      id: "mon-weakness",
      dayLabel: "Monday",
      title: "Weakness drill",
      detail: `5–10 min on ${weak}. App weights your slowest combos.`,
      action: "start-bag",
      drillMode: "combo",
      weaknessFocus: true,
      difficulty: "fighter",
    };
  }

  if (dow === 3) {
    return {
      id: "wed-opponent",
      dayLabel: "Wednesday",
      title: "Train vs a fighter",
      detail: "Solo round built from a real fighter's style and pacing.",
      action: "open-opponent",
      drillMode: "combo",
    };
  }

  if (dow === 5) {
    return {
      id: "fri-challenge",
      dayLabel: "Friday",
      title: "Challenge round",
      detail: "Champion pace combo drill — tight windows, max focus.",
      action: "start-bag",
      drillMode: "combo",
      difficulty: "champion",
    };
  }

  if (dow === 0 || dow === 6) {
    return {
      id: "weekend-flurry",
      dayLabel: DAY_NAMES[dow],
      title: "Punch flurry test",
      detail: "30 seconds — how many clean hits can you land?",
      action: "start-bag",
      drillMode: "flurry",
      difficulty: "fighter",
    };
  }

  return {
    id: "combo-default",
    dayLabel: DAY_NAMES[dow],
    title: "Combo drill",
    detail: "Called combos on the bag. AI scores technique if using Fighter cam.",
    action: "start-bag",
    drillMode: "combo",
    difficulty: "fighter",
  };
}

export function buildConfigFromWeeklyPlan(
  plan: WeeklyPlanDay,
  cameraMode: BagTrainingConfig["cameraMode"] = "fighter"
): Partial<BagTrainingConfig> {
  const difficulty = plan.difficulty ?? "fighter";
  return {
    drillMode: plan.drillMode,
    weaknessFocus: plan.weaknessFocus,
    difficulty,
    cameraMode,
    timing: defaultTiming(difficulty),
    flurrySeconds: plan.drillMode === "flurry" ? 30 : undefined,
    weeklyPlanId: plan.id,
  };
}

/** Compact row for home — Mon / Wed / Fri highlights */
export function getWeekRitualStrip(data: FightFloBagData): WeeklyPlanDay[] {
  const weak = weaknessSummary(data);
  return [
    {
      id: "mon-weakness",
      dayLabel: "Mon",
      title: "Weakness drill",
      detail: `Work ${weak}`,
      action: "start-bag",
      drillMode: "combo",
      weaknessFocus: true,
      difficulty: "fighter",
    },
    {
      id: "wed-opponent",
      dayLabel: "Wed",
      title: "Train vs fighter",
      detail: "AI-built opponent session",
      action: "open-opponent",
      drillMode: "combo",
    },
    {
      id: "fri-challenge",
      dayLabel: "Fri",
      title: "Challenge round",
      detail: "Champion pace combos",
      action: "start-bag",
      drillMode: "combo",
      difficulty: "champion",
    },
  ];
}
