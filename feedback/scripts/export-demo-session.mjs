#!/usr/bin/env node
/**
 * Export a completed session + report into lib/demo/sampleData.ts
 *
 * Usage:
 *   node scripts/export-demo-session.mjs <sessionId> [baseUrl]
 *
 * Example:
 *   node scripts/export-demo-session.mjs f97ad611-4a58-4a81-9703-877755b14d8a http://localhost:3001/feedback
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const sessionId = process.argv[2];
const baseUrl =
  process.argv[3] ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3001/feedback";

if (!sessionId) {
  console.error("Usage: node scripts/export-demo-session.mjs <sessionId> [baseUrl]");
  process.exit(1);
}

const apiBase = baseUrl.replace(/\/$/, "");

const res = await fetch(`${apiBase}/api/report?sessionId=${sessionId}`);
if (!res.ok) {
  console.error("Failed to fetch report:", res.status, await res.text());
  process.exit(1);
}

const { report, session } = await res.json();
if (!report || !session) {
  console.error("Missing report or session in response");
  process.exit(1);
}

const libDir = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "demo");
const outPath = join(libDir, "sampleData.ts");

const feedback = {
  positives: report.positives,
  main_weakness: report.main_weakness,
  pattern_insight: report.pattern_insight,
  drill: report.drill,
  coach_summary: report.coach_summary,
};

const poseQuality = report.pose_quality ?? {
  score: 38,
  frames_total: report.raw_landmark_data?.length ?? 0,
  frames_with_pose: 0,
  avg_visibility: 0,
  usable: false,
  message:
    "Tracking was limited in this session — coaching is based on video frames and movement patterns.",
};

const content = `import type {
  CoachingFeedback,
  ConfirmedPoseEvent,
  PoseQualityReport,
  ReportClip,
  SkillLevel,
  SportId,
} from "@/types";

/**
 * Baked from real analysis: ${session.display_name ?? session.id}
 * Source session: ${sessionId}
 * Re-export: node scripts/export-demo-session.mjs <sessionId>
 */

export const DEMO_SOURCE_SESSION_ID = ${JSON.stringify(sessionId)};

export const DEMO_VIDEO_URL = ${JSON.stringify(session.video_url)};

export const DEMO_CLOUDINARY_PUBLIC_ID = ${JSON.stringify(session.cloudinary_public_id ?? "")};

export const DEMO_VIDEO_DURATION = ${session.video_duration ?? 0};

export const DEMO_DISPLAY_NAME = ${JSON.stringify(session.display_name ?? `Boxing · Session ${session.session_number}`)};

export const DEMO_SUMMARY = ${JSON.stringify(
  (session.summary ?? report.coach_summary ?? "").replace(/…$/, "")
)};

export const DEMO_THUMBNAIL_URL = ${JSON.stringify(
  session.thumbnail_url ??
    (session.cloudinary_public_id
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME ?? "dpf6rw5sm"}/video/upload/so_1,w_160,h_160,c_fill,q_auto,f_jpg/${session.cloudinary_public_id}.jpg`
      : "")
)};

const DEMO_FEEDBACK: CoachingFeedback = ${JSON.stringify(feedback, null, 2)};

const DEMO_CLIPS: ReportClip[] = ${JSON.stringify(report.clips ?? [], null, 2)};

const DEMO_POSE_QUALITY: PoseQualityReport = ${JSON.stringify(poseQuality, null, 2)};

const DEMO_CONFIRMED_EVENTS: ConfirmedPoseEvent[] = ${JSON.stringify(
  report.confirmed_events ?? [],
  null,
  2
)};

const DEMO_LANDMARK_SUMMARY: Record<string, unknown> = ${JSON.stringify(
  report.landmark_summary ?? { source_session_id: sessionId },
  null,
  2
)};

export function getDemoFeedback(
  _sport: SportId,
  _level: SkillLevel
): CoachingFeedback {
  return DEMO_FEEDBACK;
}

export function getDemoClips(_feedback: CoachingFeedback): ReportClip[] {
  return DEMO_CLIPS;
}

export function getDemoPoseQuality(): PoseQualityReport {
  return DEMO_POSE_QUALITY;
}

export function getDemoConfirmedEvents(): ConfirmedPoseEvent[] {
  return DEMO_CONFIRMED_EVENTS;
}

export function getDemoLandmarkSummary(): Record<string, unknown> {
  return DEMO_LANDMARK_SUMMARY;
}
`;

writeFileSync(outPath, content);
console.log(`Wrote ${outPath}`);
console.log(`  video: ${session.video_url}`);
console.log(`  weakness: ${report.main_weakness?.title}`);
console.log(`  clips: ${(report.clips ?? []).length}`);
