export interface AnalysisStepConfig {
  percent: number;
  eyebrow: string;
  headline: string;
  /** Single-line fallback when server has not sent a message yet */
  detail: string;
  /** @deprecated Use detail — kept for legacy loaders */
  ticks: string[];
}

export const ANALYSIS_STEPS: Record<string, AnalysisStepConfig> = {
  uploading: {
    percent: 10,
    eyebrow: "Uploading",
    headline: "Sending your video",
    detail: "Transferring your clip to secure storage…",
    ticks: ["Transferring your clip to secure storage…"],
  },
  extracting_frames: {
    percent: 22,
    eyebrow: "Frame extraction",
    headline: "Reading your footage",
    detail: "Pulling frames from your video at 12 fps for analysis…",
    ticks: ["Pulling frames from your video at 12 fps for analysis…"],
  },
  detecting_sport: {
    percent: 32,
    eyebrow: "Sport check",
    headline: "Confirming your discipline",
    detail: "Checking stances and strikes to confirm boxing vs Muay Thai…",
    ticks: ["Checking stances and strikes to confirm boxing vs Muay Thai…"],
  },
  analysing_movement: {
    percent: 48,
    eyebrow: "Movement scan",
    headline: "Mapping your body",
    detail: "Tracking body position on each frame…",
    ticks: ["Tracking body position on each frame…"],
  },
  finding_patterns: {
    percent: 62,
    eyebrow: "Pattern scan",
    headline: "Finding habits",
    detail: "Measuring guard height, chin tuck, elbow angles, and timing…",
    ticks: ["Measuring guard height, chin tuck, elbow angles, and timing…"],
  },
  writing_report: {
    percent: 78,
    eyebrow: "AI coaching",
    headline: "Writing your report",
    detail: "Reviewing tracked moments and drafting your breakdown…",
    ticks: ["Reviewing tracked moments and drafting your breakdown…"],
  },
  generating_clips: {
    percent: 92,
    eyebrow: "Highlight clips",
    headline: "Cutting key moments",
    detail: "Exporting timestamped clips for each coaching moment…",
    ticks: ["Exporting timestamped clips for each coaching moment…"],
  },
  preparing_download: {
    percent: 97,
    eyebrow: "Download prep",
    headline: "Preparing your replay",
    detail: "Burning the skeleton overlay so your download is instant…",
    ticks: ["Burning the skeleton overlay so your download is instant…"],
  },
  complete: {
    percent: 100,
    eyebrow: "Done",
    headline: "Report ready",
    detail: "Your coaching report is ready to view.",
    ticks: ["Your coaching report is ready to view."],
  },
};

export const DEFAULT_ANALYSIS_STEP = ANALYSIS_STEPS.extracting_frames;

export const LOADING_MESSAGES = Object.entries(ANALYSIS_STEPS).map(
  ([step, config]) => ({
    step,
    message: config.detail,
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
  acceptedMimeTypes: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/3gpp",
    "video/3gpp2",
    "video/hevc",
    "video/x-m4v",
  ],
  acceptedExtensions: [".mp4", ".mov", ".avi", ".m4v", ".3gp", ".webm"],
  /** Broad accept list — required for reliable iOS video picker */
  acceptAttribute: "video/*,.mp4,.mov,.m4v,.avi",
};
