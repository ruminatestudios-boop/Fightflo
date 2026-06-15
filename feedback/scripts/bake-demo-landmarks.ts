/**
 * Bake pose landmarks for the demo video (lite MediaPipe model, IMAGE mode).
 *
 *   npx tsx scripts/bake-demo-landmarks.ts
 */
import { writeFile } from "fs/promises";
import { join } from "path";
import { loadImage } from "@napi-rs/canvas";
import { extractFrames, cleanupSessionFiles } from "../lib/analysis/extractFrames";
import { smoothLandmarkTimeline } from "../lib/analysis/landmarkSmoothing";
import { assessPoseQuality } from "../lib/analysis/poseQuality";
import { FRAMES_PER_SECOND, frameToTimestamp } from "../lib/analysis/timestamps";
import { getSportConfig } from "../config/sports";
import {
  DEMO_VIDEO_URL,
  DEMO_SOURCE_SESSION_ID,
} from "../lib/demo/sampleData";
import type { FrameLandmarks, LandmarkTimeline } from "../types";

const OUT_PATH = join(process.cwd(), "lib/demo/landmarkData.json");

const LANDMARK_MAP: Record<number, keyof FrameLandmarks> = {
  0: "nose",
  11: "left_shoulder",
  12: "right_shoulder",
  13: "left_elbow",
  14: "right_elbow",
  15: "left_wrist",
  16: "right_wrist",
  23: "left_hip",
  24: "right_hip",
  25: "left_knee",
  26: "right_knee",
  27: "left_ankle",
  28: "right_ankle",
};

const LITE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

function mapPose(
  pose: Array<{ x: number; y: number; z: number; visibility?: number }>,
  indices: number[]
): FrameLandmarks {
  const landmarks: FrameLandmarks = {};
  for (const idx of indices) {
    const key = LANDMARK_MAP[idx];
    const point = pose[idx];
    if (key && point && (point.visibility ?? 1) > 0.2) {
      landmarks[key] = {
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: point.visibility,
      };
    }
  }
  return landmarks;
}

async function main() {
  const sessionId = `bake-${DEMO_SOURCE_SESSION_ID.slice(0, 8)}`;
  console.log("\nBaking demo landmarks (lite model):", DEMO_VIDEO_URL, "\n");

  const framePaths = await extractFrames(DEMO_VIDEO_URL, sessionId);
  console.log(`Extracted ${framePaths.length} frames`);

  const { FilesetResolver, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );
  const { ensureMediaPipeServerRuntime, getMediaPipeVisionWasmBaseUrl } =
    await import("../lib/analysis/mediaPipeServerRuntime");
  ensureMediaPipeServerRuntime();

  const vision = await FilesetResolver.forVisionTasks(
    getMediaPipeVisionWasmBaseUrl()
  );
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: LITE_MODEL,
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    numPoses: 1,
  });

  const indices = getSportConfig("boxing").landmarks_to_track;
  const rawTimeline: LandmarkTimeline = [];

  for (let i = 0; i < framePaths.length; i++) {
    try {
      const image = await loadImage(framePaths[i]);
      const result = landmarker.detect(image as unknown as TexImageSource);
      const pose = result.landmarks[0];
      rawTimeline.push({
        frame: i,
        timestamp: frameToTimestamp(i),
        landmarks: pose ? mapPose(pose, indices) : {},
      });
    } catch (error) {
      console.warn(`Frame ${i} failed:`, error);
      rawTimeline.push({
        frame: i,
        timestamp: frameToTimestamp(i),
        landmarks: {},
      });
    }

    if (i > 0 && i % 30 === 0) {
      console.log(`  … ${i}/${framePaths.length}`);
    }
  }

  landmarker.close();

  const timeline = smoothLandmarkTimeline(rawTimeline, FRAMES_PER_SECOND);
  const quality = assessPoseQuality(timeline);
  const withPose = timeline.filter((f) => Object.keys(f.landmarks).length > 0)
    .length;

  console.log(
    `Pose: ${withPose}/${timeline.length} frames, score ${quality.score}, usable ${quality.usable}`
  );

  await writeFile(
    OUT_PATH,
    JSON.stringify(
      {
        timeline,
        pose_quality: quality,
        landmark_summary: {
          source_session_id: DEMO_SOURCE_SESSION_ID,
          baked_at: new Date().toISOString(),
        },
        confirmed_events: [],
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
