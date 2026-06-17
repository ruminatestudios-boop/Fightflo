/** Three user-facing phases — maps many server steps into one clear journey */

export interface UserAnalysisPhase {
  index: 1 | 2 | 3;
  label: string;
  shortLabel: string;
  detail: string;
  serverSteps: string[];
}

export const USER_ANALYSIS_PHASES: UserAnalysisPhase[] = [
  {
    index: 1,
    label: "Upload",
    shortLabel: "Send video",
    detail: "Securely transferring your clip",
    serverSteps: ["uploading"],
  },
  {
    index: 2,
    label: "Analyze",
    shortLabel: "Read footage",
    detail: "Reading frames and scanning your movement",
    serverSteps: [
      "extracting_frames",
      "detecting_sport",
      "analysing_movement",
      "finding_patterns",
    ],
  },
  {
    index: 3,
    label: "Report",
    shortLabel: "AI coaching",
    detail: "Building your coaching report",
    serverSteps: [
      "writing_report",
      "generating_clips",
      "preparing_download",
      "complete",
    ],
  },
];

export function userPhaseForStep(step: string): UserAnalysisPhase {
  const found = USER_ANALYSIS_PHASES.find((phase) =>
    phase.serverSteps.includes(step)
  );
  return found ?? USER_ANALYSIS_PHASES[1];
}

export function userPhaseIndexForStep(step: string): 1 | 2 | 3 {
  return userPhaseForStep(step).index;
}

/** Client upload hook phases before server step is available */
export function userPhaseForUploadClient(
  phase: "uploading" | "processing" | "idle" | "complete" | "error",
  progress: number
): UserAnalysisPhase {
  if (phase === "processing") {
    return USER_ANALYSIS_PHASES[1];
  }
  if (phase === "uploading" && progress >= 75) {
    return USER_ANALYSIS_PHASES[1];
  }
  if (phase === "uploading") {
    return USER_ANALYSIS_PHASES[0];
  }
  return USER_ANALYSIS_PHASES[0];
}

/** Overall 0–100 bar spanning all three phases */
export function blendedProgressPercent(
  phaseIndex: 1 | 2 | 3,
  stepProgress: number
): number {
  const slice = 100 / 3;
  const phaseStart = (phaseIndex - 1) * slice;
  const clamped = Math.min(100, Math.max(0, stepProgress));
  return Math.round(phaseStart + (clamped / 100) * slice);
}
