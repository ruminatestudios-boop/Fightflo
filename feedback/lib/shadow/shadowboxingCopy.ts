import type { FrameLandmarks } from "@/types";
import { formatTime } from "@/components/video/utils";
import type { FrameMetrics } from "@/lib/analysis/poseMetrics";

export type ShadowWeaknessType =
  | "guard_drop_after_cross"
  | "slow_guard_return"
  | "elbow_flare_on_cross"
  | "chin_up"
  | "flat_hips"
  | "stance_drift";

export type ShadowPositiveType =
  | "quick_guard_return"
  | "elbow_tucked"
  | "chin_stayed_down"
  | "good_hip_turn";

export interface ShadowMoment {
  id: string;
  kind: "issue" | "positive";
  elapsedSec: number;
  timestamp: string;
  eventType: ShadowWeaknessType | ShadowPositiveType;
  title: string;
  detail: string;
  fix: string;
  joint: keyof FrameLandmarks;
}

const ISSUE_COPY: Record<
  ShadowWeaknessType,
  { title: string; detail: string; fix: string; joint: keyof FrameLandmarks }
> = {
  guard_drop_after_cross: {
    title: "Hand dropped below guard",
    detail: "Wrist fell below your cheek line after throwing — recovery window open.",
    fix: "Return hands to cheeks before feet move.",
    joint: "right_wrist",
  },
  slow_guard_return: {
    title: "Slow guard return",
    detail: "Hands hung after the combo instead of snapping back.",
    fix: "Count 1-2 on the punch, 3 on the return to guard.",
    joint: "right_wrist",
  },
  elbow_flare_on_cross: {
    title: "Elbow flared on extension",
    detail: "Elbow opened wide on the punch — telegraphs and exposes the rib.",
    fix: "Punch through a narrow tunnel; elbow brushes your ribs.",
    joint: "right_elbow",
  },
  chin_up: {
    title: "Chin riding up",
    detail: "Head lifted above the shoulder line — chin exposed.",
    fix: "Tuck chin to lead shoulder on the cross.",
    joint: "nose",
  },
  flat_hips: {
    title: "Flat hips when punching",
    detail: "Shoulders and hips stayed square through the shot — arm-only power.",
    fix: "Turn the rear hip with the rear hand before extension.",
    joint: "right_hip",
  },
  stance_drift: {
    title: "Stance drifting off centre",
    detail: "Base shifted sideways while throwing — balance and defence suffer.",
    fix: "Shadow on a tape line; feet stay under your hips.",
    joint: "left_hip",
  },
};

const POSITIVE_COPY: Record<
  ShadowPositiveType,
  { title: string; detail: string; fix: string; joint: keyof FrameLandmarks }
> = {
  quick_guard_return: {
    title: "Quick guard return",
    detail: "Hands snapped back to guard right after the combo.",
    fix: "Keep this rhythm when you add footwork.",
    joint: "right_wrist",
  },
  elbow_tucked: {
    title: "Elbow tucked on extension",
    detail: "Elbow stayed in on the punch — clean mechanics.",
    fix: "Same form on the lead hook and uppercuts.",
    joint: "right_elbow",
  },
  chin_stayed_down: {
    title: "Chin stayed tucked",
    detail: "Head position held through the exchange.",
    fix: "Maintain this under fatigue in round 2+.",
    joint: "nose",
  },
  good_hip_turn: {
    title: "Hip turned with the punch",
    detail: "Shoulders and hips rotated together on extension.",
    fix: "Carry this into pad work and bag rounds.",
    joint: "right_hip",
  },
};

export function makeShadowIssueMoment(
  type: ShadowWeaknessType,
  elapsedSec: number,
  index: number,
  jointOverride?: keyof FrameLandmarks
): ShadowMoment {
  const copy = ISSUE_COPY[type];
  return {
    id: `issue-${index}`,
    kind: "issue",
    elapsedSec,
    timestamp: formatTime(elapsedSec),
    eventType: type,
    title: copy.title,
    detail: copy.detail,
    fix: copy.fix,
    joint: jointOverride ?? copy.joint,
  };
}

export function makeShadowPositiveMoment(
  type: ShadowPositiveType,
  elapsedSec: number,
  index: number
): ShadowMoment {
  const copy = POSITIVE_COPY[type];
  return {
    id: `positive-${index}`,
    kind: "positive",
    elapsedSec,
    timestamp: formatTime(elapsedSec),
    eventType: type,
    title: copy.title,
    detail: copy.detail,
    fix: copy.fix,
    joint: copy.joint,
  };
}

function resolveHandJoint(
  metrics: FrameMetrics
): keyof FrameLandmarks {
  if (metrics.left_wrist_below_guard && metrics.right_wrist_below_guard) {
    return "right_wrist";
  }
  if (metrics.left_wrist_below_guard) return "left_wrist";
  return "right_wrist";
}

/** Live callout for the current frame — drives cinema pill + joint highlight */
export function liveShadowboxingNote(
  metrics: FrameMetrics
): {
  kind: "issue" | "positive";
  title: string;
  detail: string;
  fix: string;
  joint: keyof FrameLandmarks;
} | null {
  if (!metrics.metrics_reliable) return null;

  if (metrics.guard_dropped && metrics.guard_confidence >= 0.45) {
    const copy = ISSUE_COPY.guard_drop_after_cross;
    return {
      kind: "issue",
      title: copy.title,
      detail: copy.detail,
      fix: copy.fix,
      joint: resolveHandJoint(metrics),
    };
  }

  if (metrics.chin_elevated) {
    const copy = ISSUE_COPY.chin_up;
    return {
      kind: "issue",
      title: copy.title,
      detail: copy.detail,
      fix: copy.fix,
      joint: copy.joint,
    };
  }

  if (
    metrics.right_elbow_angle !== null &&
    metrics.right_elbow_angle < 152
  ) {
    const copy = ISSUE_COPY.elbow_flare_on_cross;
    return {
      kind: "issue",
      title: copy.title,
      detail: copy.detail,
      fix: copy.fix,
      joint: "right_elbow",
    };
  }

  if (
    metrics.left_elbow_angle !== null &&
    metrics.left_elbow_angle < 152
  ) {
    const copy = ISSUE_COPY.elbow_flare_on_cross;
    return {
      kind: "issue",
      title: "Lead elbow flared",
      detail: copy.detail,
      fix: copy.fix,
      joint: "left_elbow",
    };
  }

  if (
    metrics.hip_rotation_deg !== null &&
    metrics.hip_rotation_deg >= 28
  ) {
    const copy = POSITIVE_COPY.good_hip_turn;
    return {
      kind: "positive",
      title: copy.title,
      detail: copy.detail,
      fix: copy.fix,
      joint: copy.joint,
    };
  }

  if (
    !metrics.guard_dropped &&
    metrics.guard_confidence >= 0.5 &&
    !metrics.chin_elevated
  ) {
    const copy = POSITIVE_COPY.chin_stayed_down;
    return {
      kind: "positive",
      title: "Hands up · chin down",
      detail: "Guard and head position look solid right now.",
      fix: copy.fix,
      joint: "nose",
    };
  }

  return null;
}

export function buildShadowRoundSummary(input: {
  moments: ShadowMoment[];
  roundSeconds: number;
}): {
  summary: string;
  mechanicalFix: string;
  drillName: string;
  primaryIssue: ShadowWeaknessType | null;
} {
  const issues = input.moments.filter((m) => m.kind === "issue");
  const positives = input.moments.filter((m) => m.kind === "positive");

  const byType = new Map<string, number>();
  for (const m of issues) {
    byType.set(m.eventType, (byType.get(m.eventType) ?? 0) + 1);
  }

  let primaryIssue: ShadowWeaknessType | null = null;
  let maxCount = 0;
  for (const [type, count] of byType) {
    if (count > maxCount) {
      maxCount = count;
      primaryIssue = type as ShadowWeaknessType;
    }
  }

  const drills: Record<ShadowWeaknessType, string> = {
    guard_drop_after_cross: "Mirror shadow — touch cheeks after every cross",
    slow_guard_return: "Jab-cross recoil — count frames until guard returns",
    elbow_flare_on_cross: "Wall elbow drill — elbows grazing ribs for 2 min",
    chin_up: "Chin-to-shoulder shadow — pause in guard every 4 punches",
    flat_hips: "Hip-first shadow — pivot rear foot on every cross",
    stance_drift: "Tape-line shadow — feet stay on a line for 2 min",
  };

  const summary =
    issues.length === 0
      ? `Clean round — ${positives.length} good moment${positives.length === 1 ? "" : "s"} flagged. Tap each card to review what we caught.`
      : `${issues.length} issue${issues.length === 1 ? "" : "s"} and ${positives.length} good moment${positives.length === 1 ? "" : "s"} flagged live. Tap a timestamp to see what happened.`;

  const primaryCopy = primaryIssue ? ISSUE_COPY[primaryIssue] : null;

  return {
    summary,
    mechanicalFix: primaryCopy?.fix ?? POSITIVE_COPY.quick_guard_return.fix,
    drillName: primaryIssue ? drills[primaryIssue] : "Mirror shadow — 3×1 min defensive first",
    primaryIssue,
  };
}
