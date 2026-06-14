export const LOADING_MESSAGES = [
  { step: "uploading", message: "Uploading your video...", percent: 10 },
  { step: "extracting_frames", message: "Extracting frames...", percent: 25 },
  { step: "analysing_movement", message: "Analysing your movement...", percent: 45 },
  { step: "finding_patterns", message: "Finding patterns...", percent: 60 },
  { step: "writing_report", message: "Writing your coaching report...", percent: 80 },
  { step: "generating_clips", message: "Almost ready...", percent: 95 },
  { step: "complete", message: "Your report is ready.", percent: 100 },
] as const;

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
