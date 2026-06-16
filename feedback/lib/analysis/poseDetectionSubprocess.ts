import { spawn } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { SportId } from "@/types";
import type { PoseDetectionResult } from "@/lib/analysis/poseDetectionCore";

function feedbackRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith("feedback")) return cwd;
  return join(cwd, "feedback");
}

function resolveCliScript(): string {
  return join(feedbackRoot(), "scripts", "detect-pose-cli.ts");
}

/** MediaPipe cannot run inside the Next.js webpack bundle — use plain Node. */
export async function detectPoseWithMetaSubprocess(
  framePaths: string[],
  sport: SportId
): Promise<PoseDetectionResult> {
  const workDir = join(tmpdir(), `pose-cli-${Date.now()}`);
  await mkdir(workDir, { recursive: true });
  const inputPath = join(workDir, "input.json");
  const outputPath = join(workDir, "output.json");

  try {
    await writeFile(
      inputPath,
      JSON.stringify({ sport, framePaths })
    );

    const scriptPath = resolveCliScript();
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "npx",
        ["--yes", "tsx", scriptPath, inputPath, outputPath],
        {
          cwd: feedbackRoot(),
          env: process.env,
          stdio: ["ignore", "ignore", "pipe"],
        }
      );

      let err = "";
      child.stderr.on("data", (chunk: Buffer) => {
        err += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(err.trim() || `Pose CLI exited with code ${code}`));
      });
    });

    const raw = await readFile(outputPath, "utf8");
    return JSON.parse(raw) as PoseDetectionResult;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
