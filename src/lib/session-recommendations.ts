import type { SessionStats } from "./types";
import { loadWorkoutHistory } from "./history";
import { isPro } from "./subscription";

export interface SessionNextStep {
  title: string;
  detail: string;
  action: "quick" | "opponent" | "harder" | "challenge" | "pro" | "home";
}

export function getSessionNextStep(
  stats: SessionStats,
  isProUser = isPro()
): SessionNextStep {
  const history = loadWorkoutHistory();
  const count = history.length;

  if (count <= 1 && stats.mode === "easy") {
    return {
      title: "Nice first round",
      detail: "Try Train vs a fighter — coach builds a session for their style.",
      action: "opponent",
    };
  }

  if (count <= 3 && stats.mode === "easy") {
    return {
      title: "Building rhythm",
      detail: "Next: a 2-round session or pick a challenge when you feel ready.",
      action: "harder",
    };
  }

  if (!isProUser && count >= 3) {
    return {
      title: "Ready for stadium pace?",
      detail: "Pro unlocks AI opponent unlimited, stadium mode, and full history.",
      action: "pro",
    };
  }

  if (stats.challengeName) {
    return {
      title: "Challenge done",
      detail: "Train vs a different fighter or push your reaction score.",
      action: "opponent",
    };
  }

  return {
    title: "Keep the pace",
    detail: "Same again or step up difficulty in settings.",
    action: "home",
  };
}
