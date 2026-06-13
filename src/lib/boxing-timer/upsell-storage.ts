import { BAG_COPY } from "@/lib/bag-drill/copy";

const KEY = "fightflo-timer-upsell";

export interface TimerUpsellStats {
  timerSessionsCompleted: number;
  /** First-visit FlowBag link tooltip (moment 3) */
  hasSeenUpsell: boolean;
  clickedFlowBag: boolean;
}

const DEFAULT: TimerUpsellStats = {
  timerSessionsCompleted: 0,
  hasSeenUpsell: false,
  clickedFlowBag: false,
};

export function loadTimerUpsellStats(): TimerUpsellStats {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) } as TimerUpsellStats;
  } catch {
    return { ...DEFAULT };
  }
}

export function saveTimerUpsellStats(patch: Partial<TimerUpsellStats>): TimerUpsellStats {
  const next = { ...loadTimerUpsellStats(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function recordTimerSessionComplete(): TimerUpsellStats {
  const stats = loadTimerUpsellStats();
  return saveTimerUpsellStats({
    timerSessionsCompleted: stats.timerSessionsCompleted + 1,
  });
}

export function recordFlowBagClick(): TimerUpsellStats {
  return saveTimerUpsellStats({ clickedFlowBag: true });
}

export function markUpsellTooltipSeen(): TimerUpsellStats {
  return saveTimerUpsellStats({ hasSeenUpsell: true });
}

/** Progressive home-link CTA based on session count */
export function getFlowBagLinkCta(stats = loadTimerUpsellStats()): string {
  if (stats.clickedFlowBag) return "Try FlowBag →";
  if (stats.timerSessionsCompleted >= 7) {
    return "You've done 7 sessions. See what you've been missing →";
  }
  if (stats.timerSessionsCompleted >= 3) {
    return BAG_COPY.timerUpsellCtaAfter3;
  }
  return "Try FlowBag →";
}
