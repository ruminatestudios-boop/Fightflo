/**
 * Run pose detection outside the Next.js webpack bundle (plain Node).
 *
 *   npx tsx scripts/detect-pose-cli.ts <input.json> <output.json>
 */
import { readFile, writeFile } from "fs/promises";
import { detectPoseWithMeta } from "../lib/analysis/poseDetectionCore";
import type { SportId } from "../types";

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error("Usage: detect-pose-cli.ts <input.json> <output.json>");
    process.exit(1);
  }

  const input = JSON.parse(await readFile(inputPath, "utf8")) as {
    sport: SportId;
    framePaths: string[];
  };

  const result = await detectPoseWithMeta(input.framePaths, input.sport);
  await writeFile(outputPath, JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
