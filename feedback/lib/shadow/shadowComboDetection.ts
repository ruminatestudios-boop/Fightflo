import { formatTime } from "@/components/video/utils";
import type { FrameLandmarks } from "@/types";
import type { FrameMetrics } from "@/lib/analysis/poseMetrics";

export type PunchCode = "1" | "2" | "3" | "4";

export interface DetectedPunch {
  code: PunchCode;
  label: string;
  elapsedSec: number;
  timestamp: string;
  hand: "lead" | "rear";
}

export interface ComboRecommendation {
  combo: string;
  label: string;
  reason: string;
}

export interface ShadowComboAnalysis {
  punches: DetectedPunch[];
  comboCounts: { combo: string; label: string; count: number }[];
  topCombos: string[];
  recommendMore: ComboRecommendation[];
  comboDrill: string;
}

const PUNCH_NAMES: Record<PunchCode, string> = {
  "1": "jab",
  "2": "cross",
  "3": "lead hook",
  "4": "rear hook",
};

const COMBO_LABELS: Record<string, string> = {
  "1": "Jab",
  "2": "Cross",
  "3": "Lead hook",
  "4": "Rear hook",
  "1-2": "Jab → cross",
  "1-1-2": "Double jab → cross",
  "1-2-3": "Jab → cross → lead hook",
  "1-2-3-2": "Jab → cross → hook → cross",
  "2-3-2": "Cross → lead hook → cross",
  "1-3-2": "Jab → lead hook → cross",
};

const MIN_REACH = 0.12;
const COMBO_GAP_SEC = 1.35;

export interface ExtensionPeak {
  hand: "lead" | "rear";
  maxReach: number;
  elbowAngle: number | null;
  lateral: number;
  forward: number;
}

export function createExtensionPeak(): ExtensionPeak | null {
  return null;
}

function leadRearReach(
  landmarks: FrameLandmarks,
  metrics: FrameMetrics
): { hand: "lead" | "rear"; reach: number; lateral: number; forward: number; elbow: number | null } | null {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lw = landmarks.left_wrist;
  const rw = landmarks.right_wrist;
  if (!ls || !rs) return null;

  const leadReach =
    lw && metrics.metrics_reliable
      ? Math.hypot(lw.x - ls.x, lw.y - ls.y)
      : 0;
  const rearReach =
    rw && metrics.metrics_reliable
      ? Math.hypot(rw.x - rs.x, rw.y - rs.y)
      : 0;

  if (leadReach < MIN_REACH && rearReach < MIN_REACH) return null;

  if (rearReach >= leadReach) {
    const lateral = rw && rs ? Math.abs(rw.x - rs.x) : 0;
    const forward = rw && rs ? Math.abs(rw.y - rs.y) : 0;
    return {
      hand: "rear",
      reach: rearReach,
      lateral,
      forward,
      elbow: metrics.right_elbow_angle,
    };
  }

  const lateral = lw && ls ? Math.abs(lw.x - ls.x) : 0;
  const forward = lw && ls ? Math.abs(lw.y - ls.y) : 0;
  return {
    hand: "lead",
    reach: leadReach,
    lateral,
    forward,
    elbow: metrics.left_elbow_angle,
  };
}

export function updateExtensionPeak(
  peak: ExtensionPeak | null,
  landmarks: FrameLandmarks,
  metrics: FrameMetrics
): ExtensionPeak | null {
  const sample = leadRearReach(landmarks, metrics);
  if (!sample || sample.reach < MIN_REACH) return peak;

  if (!peak || sample.reach >= peak.maxReach) {
    return {
      hand: sample.hand,
      maxReach: sample.reach,
      elbowAngle: sample.elbow,
      lateral: sample.lateral,
      forward: sample.forward,
    };
  }

  return peak;
}

export function classifyExtensionPeak(peak: ExtensionPeak | null): DetectedPunch | null {
  if (!peak || peak.maxReach < MIN_REACH) return null;

  const total = peak.lateral + peak.forward + 0.001;
  const lateralRatio = peak.lateral / total;
  const bentElbow = peak.elbowAngle !== null && peak.elbowAngle < 145;
  const isHook = bentElbow || lateralRatio > 0.52;

  let code: PunchCode;
  if (peak.hand === "lead") {
    code = isHook ? "3" : "1";
  } else {
    code = isHook ? "4" : "2";
  }

  return {
    code,
    label: PUNCH_NAMES[code],
    elapsedSec: 0,
    timestamp: "0:00",
    hand: peak.hand,
  };
}

export function stampPunch(punch: DetectedPunch, elapsedSec: number): DetectedPunch {
  return {
    ...punch,
    elapsedSec,
    timestamp: formatTime(elapsedSec),
  };
}

export function appendPunchToChain(
  chain: DetectedPunch[],
  punch: DetectedPunch
): DetectedPunch[] {
  if (chain.length === 0) return [punch];
  const last = chain[chain.length - 1];
  if (punch.elapsedSec - last.elapsedSec > COMBO_GAP_SEC) {
    return [punch];
  }
  return [...chain, punch];
}

export function comboKeyFromChain(chain: DetectedPunch[]): string {
  return chain.map((p) => p.code).join("-");
}

export function comboLabel(combo: string): string {
  if (COMBO_LABELS[combo]) return COMBO_LABELS[combo];
  return combo
    .split("-")
    .map((c) => COMBO_LABELS[c] ?? c)
    .join(" → ");
}

export function formatComboAtTime(chain: DetectedPunch[], elapsedSec: number): string {
  if (chain.length === 0) return "";
  const key = comboKeyFromChain(chain);
  const label = comboLabel(key);
  return `${label} (${key}) at ${formatTime(elapsedSec)}`;
}

function countCombos(punches: DetectedPunch[]): Map<string, number> {
  const counts = new Map<string, number>();
  if (punches.length === 0) return counts;

  let chain: DetectedPunch[] = [];
  for (const punch of punches) {
    if (chain.length === 0) {
      chain = [punch];
      continue;
    }
    const last = chain[chain.length - 1];
    if (punch.elapsedSec - last.elapsedSec > COMBO_GAP_SEC) {
      if (chain.length >= 2) {
        const key = comboKeyFromChain(chain);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      chain = [punch];
    } else {
      chain = [...chain, punch];
    }
  }

  if (chain.length >= 2) {
    const key = comboKeyFromChain(chain);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const punch of punches) {
    counts.set(punch.code, (counts.get(punch.code) ?? 0) + 1);
  }

  return counts;
}

function targetsForRound(roundSeconds: number) {
  const minutes = roundSeconds / 60;

  if (minutes >= 15) {
    return [
      { combo: "1-2", min: Math.max(8, Math.round(minutes * 0.55)), label: "Jab → cross" },
      { combo: "1-2-3", min: Math.max(4, Math.round(minutes * 0.3)), label: "Jab → cross → lead hook" },
      { combo: "1-1-2", min: Math.max(3, Math.round(minutes * 0.2)), label: "Double jab → cross" },
      { combo: "2-3-2", min: Math.max(2, Math.round(minutes * 0.15)), label: "Cross → lead hook → cross" },
    ];
  }
  if (minutes >= 5) {
    return [
      { combo: "1-2", min: Math.max(4, Math.round(minutes * 0.5)), label: "Jab → cross" },
      { combo: "1-2-3", min: Math.max(2, Math.round(minutes * 0.28)), label: "Jab → cross → lead hook" },
      { combo: "1-1-2", min: Math.max(1, Math.round(minutes * 0.18)), label: "Double jab → cross" },
      { combo: "2-3-2", min: Math.max(1, Math.round(minutes * 0.12)), label: "Cross → lead hook → cross" },
    ];
  }
  if (roundSeconds >= 120) {
    return [
      { combo: "1-2", min: 4, label: "Jab → cross" },
      { combo: "1-2-3", min: 2, label: "Jab → cross → lead hook" },
      { combo: "1-1-2", min: 1, label: "Double jab → cross" },
      { combo: "2-3-2", min: 1, label: "Cross → lead hook → cross" },
    ];
  }
  return [
    { combo: "1-2", min: 2, label: "Jab → cross" },
    { combo: "1-2-3", min: 1, label: "Jab → cross → lead hook" },
    { combo: "1-1-2", min: 1, label: "Double jab → cross" },
  ];
}

export function buildShadowComboAnalysis(
  punches: DetectedPunch[],
  roundSeconds: number
): ShadowComboAnalysis {
  const rawCounts = countCombos(punches);
  const comboCounts = [...rawCounts.entries()]
    .filter(([key]) => key.includes("-"))
    .map(([combo, count]) => ({
      combo,
      label: comboLabel(combo),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const topCombos = comboCounts.slice(0, 3).map((c) => `${c.label} ×${c.count}`);

  const recommendMore: ComboRecommendation[] = [];
  for (const target of targetsForRound(roundSeconds)) {
    const thrown = rawCounts.get(target.combo) ?? 0;
    if (thrown < target.min) {
      recommendMore.push({
        combo: target.combo,
        label: target.label,
        reason: `You threw ${target.label} ${thrown}× — aim for at least ${target.min}× next round. Keep guard up on the exit.`,
      });
    }
  }

  if (recommendMore.length === 0 && comboCounts.length > 0) {
    const weakest = comboCounts[comboCounts.length - 1];
    recommendMore.push({
      combo: "1-2-3-2",
      label: "Jab → cross → hook → cross",
      reason: `You leaned on ${comboCounts[0]?.label ?? "basics"} — add 1-2-3-2 to vary rhythm and test guard on the way out.`,
    });
  }

  if (recommendMore.length === 0 && punches.length < 4) {
    recommendMore.push({
      combo: "1-2",
      label: "Jab → cross",
      reason:
        "Not enough punches detected — throw clearer 1-2s: full extension, then snap both hands back to guard.",
    });
  }

  const comboDrill =
    recommendMore[0] != null
      ? `Shadow 3×1 min: ${recommendMore[0].label} — hands back to cheeks before the next combo`
      : "Shadow 3×1 min: freestyle combos — guard returns before feet move";

  return {
    punches,
    comboCounts,
    topCombos,
    recommendMore,
    comboDrill,
  };
}
