/**
 * Verify sports pose pipeline on real fight demo footage.
 *
 *   cd feedback && npx tsx scripts/verify-fighting-pose.ts
 */
import { detectPoseWithMeta } from "../lib/analysis/poseDetectionCore";
import { extractFrames, cleanupSessionFiles } from "../lib/analysis/extractFrames";
import { DEMO_VIDEO_URL, DEMO_SOURCE_SESSION_ID } from "../lib/demo/sampleData";

async function main() {
  const sessionId = `verify-pose-${DEMO_SOURCE_SESSION_ID.slice(0, 8)}`;
  console.log("\nVerifying fighting pose on demo footage…\n", DEMO_VIDEO_URL);

  const framePaths = await extractFrames(DEMO_VIDEO_URL, sessionId);
  const result = await detectPoseWithMeta(framePaths, "boxing");

  const drawable = result.timeline.filter((frame) => {
    const joints = Object.values(frame.landmarks).filter(
      (point) => point && (point.visibility ?? 0) >= 0.65
    );
    return joints.length >= 6;
  });

  const reliableRatio =
    result.quality.frames_total > 0
      ? Math.round(
          (result.quality.frames_with_pose / result.quality.frames_total) * 100
        )
      : 0;

  console.log("Frames analysed:", result.timeline.length);
  console.log("Drawable frames (visibility ≥ 0.65):", drawable.length);
  console.log("Pose frame ratio:", `${reliableRatio}%`);
  console.log("Guard calibrated:", result.landmark_summary.guard_calibrated);

  await cleanupSessionFiles(sessionId);

  if (drawable.length < Math.floor(result.timeline.length * 0.25)) {
    console.error(
      "\n⚠ Low drawable ratio — check camera angle or lighting on fight footage."
    );
    process.exit(1);
  }

  console.log("\n✓ Fighting pose pipeline OK on demo footage.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
