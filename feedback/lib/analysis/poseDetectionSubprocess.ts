import { spawn } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { SportId } from "../../types";
import type { PoseDetectionResult } from "./poseDetectionCore";
import { assessPoseQuality } from "./poseQuality";

function feedbackRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith("feedback")) return cwd;
  // Vercel lambda: cwd is /var/task which IS the feedback root
  const nested = join(cwd, "feedback");
  if (existsSync(join(nested, "node_modules"))) return nested;
  return cwd;
}

function resolveCliScript(): { cmd: string; scriptPath: string } {
  const root = feedbackRoot();
  // Prefer the pre-compiled CJS bundle (built during `next build` by guard-build.mjs).
  // Runs with plain node — no tsx, no tsconfig path resolution, no @/ alias issues.
  const compiled = join(root, "scripts", "detect-pose-cli.cjs");
  if (existsSync(compiled)) {
    return { cmd: process.execPath, scriptPath: compiled };
  }
  // Fallback: tsx on the TypeScript source (local dev only).
  const source = join(root, "scripts", "detect-pose-cli.ts");
  const tsxBin = join(root, "node_modules", ".bin", "tsx");
  if (existsSync(tsxBin)) {
    return { cmd: tsxBin, scriptPath: source };
  }
  return { cmd: "npx", scriptPath: source };
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

    const { cmd, scriptPath } = resolveCliScript();
    const root = feedbackRoot();
    try {
      await new Promise<void>((resolve, reject) => {
      const child = spawn(
        cmd,
        [scriptPath, inputPath, outputPath],
        {
          cwd: root,
          env: { ...process.env },
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const lower = message.toLowerCase();

      // Cursor sandbox + Node 24 can block tsx IPC pipe creation. In dev, degrade gracefully.
      if (
        process.env.NODE_ENV === "development" &&
        (lower.includes("eperm") || lower.includes("operation not permitted")) &&
        (lower.includes("tsx") || lower.includes(".pipe"))
      ) {
        console.warn("[pose/subprocess] Disabled in this environment:", message);
        return {
          timeline: [],
          quality: assessPoseQuality([]),
          confirmed_events: [],
          landmark_summary: {
            error: "pose_subprocess_unavailable",
            detail: message.slice(0, 240),
          },
        };
      }

      throw error;
    }

    const raw = await readFile(outputPath, "utf8");
    return JSON.parse(raw) as PoseDetectionResult;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
