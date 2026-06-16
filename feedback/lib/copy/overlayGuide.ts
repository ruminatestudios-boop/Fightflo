import { sportUsesLegSkeleton } from "@/lib/analysis/poseMetrics";
import type { PoseQualityReport, SportId } from "@/types";

export interface OverlayGuideLegendItem {
  swatch: "skeleton" | "guard-ok" | "guard-bad" | "angle" | "trail";
  label: string;
  detail: string;
}

export interface OverlayGuideContent {
  legend: OverlayGuideLegendItem[];
  howItWorks: string[];
  expectations: string[];
  qualityNote: string | null;
}

export function buildOverlayGuideContent(
  sport: SportId,
  options?: {
    poseQuality?: PoseQualityReport | null;
    guardCalibrated?: boolean;
    isGuardMode?: boolean;
  }
): OverlayGuideContent {
  const legs = sportUsesLegSkeleton(sport);
  const guardCalibrated = options?.guardCalibrated ?? false;
  const isGuard = options?.isGuardMode ?? false;

  const legend: OverlayGuideLegendItem[] = isGuard
    ? [
        {
          swatch: "guard-ok",
          label: "Green hands",
          detail: guardCalibrated
            ? "Hands above your calibrated guard line."
            : "Hands above the estimated guard line.",
        },
        {
          swatch: "guard-bad",
          label: "Red hands & dashed line",
          detail:
            "Guard drop — wrist(s) fell below your guard line. No full skeleton in this mode.",
        },
      ]
    : [
        {
          swatch: "skeleton",
          label: "White skeleton",
          detail:
            "Shoulders, arms, hips" +
            (legs ? ", and legs" : "") +
            " tracked from your uploaded video — synced to playback.",
        },
        {
          swatch: "guard-ok",
          label: "Green wrists",
          detail: guardCalibrated
            ? "Hands above your calibrated guard line (learned from your neutral stance)."
            : "Hands above the estimated cheek/guard line.",
        },
        {
          swatch: "guard-bad",
          label: "Red wrists & dashed line",
          detail: "Guard dropped or coaching moment at this timestamp.",
        },
        {
          swatch: "angle",
          label: "HIP / elbow angles",
          detail: legs
            ? "Hip rotation for punches and kicks; elbow angle on extension. Green = in range, yellow = borderline, red = fault zone."
            : "Hip-shoulder rotation and elbow extension on punches. Green = in range, red = likely fault.",
        },
        {
          swatch: "trail",
          label: "Wrist trails",
          detail: "Short motion paths — helps you see hand speed and return after strikes.",
        },
      ];

  const howItWorks = [
    "We sample your clip at ~12 frames per second and map how your body moves in each frame.",
    guardCalibrated
      ? "Your personal guard height is calibrated from early frames where both hands were up."
      : "Guard height is estimated from shoulder and head position when calibration data is unavailable.",
    "Faults (guard drops, elbow flare, kick chamber, etc.) only count when joints are clearly visible and the pattern holds for several frames in a row — not single-frame glitches.",
    "During playback we draw the saved analysis pose so the overlay matches what the report used. If pose data is missing, we fall back to live tracking on your device.",
    legs
      ? "For kicks we read knee lift, planted-foot pivot, and shin angle at extension — legs must be in frame."
      : "Upper-body faults work best when shoulders, hips, and hands stay in frame.",
  ];

  const expectations = [
    "Side or 3/4 camera angle works best. Back-turned, heavy occlusion, or tight crops lower accuracy.",
    "This is AI-assisted feedback from 2D video — useful for patterns and reps, not a replacement for an in-person coach.",
    "Scores and red flags are estimates. Re-upload after changing camera angle or lighting for a fresh pass.",
    isGuard
      ? "Guard mode focuses only on hand height — it won't judge kicks or footwork."
      : "Coaching pills and timeline markers jump to moments the pipeline confirmed, not every skeleton twitch.",
  ];

  let qualityNote: string | null = null;
  const q = options?.poseQuality;
  if (q) {
    qualityNote =
      q.score >= 70
        ? `Pose tracking rated ${q.score}% for this clip (${q.frames_with_pose}/${q.frames_total} frames with a clear figure) — overlays should track well.`
        : q.usable
          ? `Pose tracking rated ${q.score}% — some frames were unclear; flags only fire where joints were reliable.`
          : `Pose tracking rated ${q.score}% — limited visibility. Film full body, side-on, with even lighting and re-upload.`;
  }

  return { legend, howItWorks, expectations, qualityNote };
}
