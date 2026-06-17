/**
 * Bake pose landmarks for the demo video (HEAVY MediaPipe model, fighting pipeline).
 *
 *   npx tsx scripts/bake-demo-landmarks.ts
 */
import { writeFile } from "fs/promises";
import { join } from "path";
import { detectPoseWithMeta } from "../lib/analysis/poseDetectionCore";
import { extractFrames, cleanupSessionFiles } from "../lib/analysis/extractFrames";
import {
  DEMO_VIDEO_URL,
  DEMO_SOURCE_SESSION_ID,
} from "../lib/demo/sampleData";

const OUT_PATH = join(process.cwd(), "lib/demo/landmarkData.json");

async function main() {
  const sessionId = `bake-${DEMO_SOURCE_SESSION_ID.slice(0, 8)}`;
  console.log("\nBaking demo landmarks (heavy model):", DEMO_VIDEO_URL, "\n");

  const framePaths = await extractFrames(DEMO_VIDEO_URL, sessionId);
  console.log(`Extracted ${framePaths.length} frames`);

  const result = await detectPoseWithMeta(framePaths, "boxing");
  const withPose = result.timeline.filter(
    (frame) => Object.keys(frame.landmarks).length > 0
  ).length;

  console.log(
    `Pose: ${withPose}/${result.timeline.length} frames, score ${result.quality.score}, usable ${result.quality.usable}`
  );

  await writeFile(
    OUT_PATH,
    JSON.stringify(
      {
        timeline: result.timeline,
        pose_quality: result.quality,
        landmark_summary: {
          ...result.landmark_summary,
          source_session_id: DEMO_SOURCE_SESSION_ID,
          baked_at: new Date().toISOString(),
        },
        confirmed_events: result.confirmed_events,
      },
      null,
      2
    )
  );

  console.log(`Wrote ${OUT_PATH}\n`);
  await cleanupSessionFiles(sessionId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
