export interface AnalysisStepConfig {
  percent: number;
  eyebrow: string;
  headline: string;
  ticks: string[];
}

export const ANALYSIS_STEPS: Record<string, AnalysisStepConfig> = {
  uploading: {
    percent: 10,
    eyebrow: "Uploading",
    headline: "Sending your video",
    ticks: [
      "Uploading to secure storage…",
      "Transferring video data…",
      "Almost uploaded…",
    ],
  },
  extracting_frames: {
    percent: 22,
    eyebrow: "Processing",
    headline: "Reading your movement",
    ticks: [
      "Pulling frames from your video…",
      "Scanning each moment…",
      "Building your timeline…",
    ],
  },
  detecting_sport: {
    percent: 32,
    eyebrow: "Processing",
    headline: "Reading your movement",
    ticks: [
      "Spotting techniques in footage…",
      "Identifying strikes and stances…",
      "Matching movement to your sport…",
    ],
  },
  analysing_movement: {
    percent: 48,
    eyebrow: "Pose tracking",
    headline: "Mapping your body",
    ticks: [
      "Tracking joints frame by frame…",
      "Measuring angles and rotation…",
      "Checking guard and balance…",
    ],
  },
  finding_patterns: {
    percent: 62,
    eyebrow: "Pattern scan",
    headline: "Finding habits",
    ticks: [
      "Detecting repeated mistakes…",
      "Spotting timing issues…",
      "Cross-checking movement patterns…",
    ],
  },
  writing_report: {
    percent: 78,
    eyebrow: "Coaching",
    headline: "Writing your report",
    ticks: [
      "AI coach reviewing your footage…",
      "Explaining exactly what to fix…",
      "Adding timestamped notes…",
    ],
  },
  generating_clips: {
    percent: 92,
    eyebrow: "Finishing",
    headline: "Almost ready",
    ticks: [
      "Cutting highlight clips…",
      "Syncing coaching overlays…",
      "Putting the final touches on…",
    ],
  },
  complete: {
    percent: 100,
    eyebrow: "Done",
    headline: "Report ready",
    ticks: ["Your coaching report is ready."],
  },
};

export const DEFAULT_ANALYSIS_STEP = ANALYSIS_STEPS.extracting_frames;

export const LOADING_MESSAGES = Object.entries(ANALYSIS_STEPS).map(
  ([step, config]) => ({
    step,
    message: config.ticks[0],
    percent: config.percent,
  })
);

export const SHARE_CAPTIONS: Record<string, string> = {
  boxing:
    "AI just reviewed my training. Found something my coach never told me 😳\nFree analysis → fightflo.app/feedback",
  muaythai:
    "AI broke down my Muay Thai session. The diagnosis was brutal.\nFree analysis → fightflo.app/feedback",
  golf:
    "AI reviewed my swing. The diagnosis was brutal.\nFree analysis → fightflo.app/feedback",
  tennis:
    "AI analysed my tennis session. Found a flaw I couldn't see.\nFree analysis → fightflo.app/feedback",
  default:
    "AI reviewed my training session. Technical feedback in minutes.\nFree analysis → fightflo.app/feedback",
};

export const UPLOAD_CONFIG = {
  maxSizeBytes: 500 * 1024 * 1024,
  acceptedMimeTypes: ["video/mp4", "video/quicktime", "video/x-msvideo"],
  acceptedExtensions: [".mp4", ".mov", ".avi"],
};
