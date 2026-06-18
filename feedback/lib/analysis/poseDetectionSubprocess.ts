import { spawn } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { SportId } from "@/types";
import type { PoseDetectionResult } from "@/lib/analysis/poseDetectionCore";
import { assessPoseQuality } from "@/lib/analysis/poseQuality";

function feedbackRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith("feedback")) return cwd;
  // Vercel lambda: cwd is /var/task which IS the feedback root
  const nested = join(cwd, "feedback");
  if (existsSync(join(nested, "node_modules"))) return nested;
  return cwd;
}

function resolveCliScript(): string {
  return join(feedbackRoot(), "scripts", "detect-pose-cli.ts");
}

function resolveTsxBin(): { cmd: string; args: string[] } {
  const root = feedbackRoot();
  const candidates = [
    join(root, "node_modules", ".bin", "tsx"),
    join(root, "node_modules", "tsx", "dist", "cli.mjs"),
    join(process.cwd(), "node_modules", ".bin", "tsx"),
    "/var/task/node_modules/.bin/tsx",
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      if (p.endsWith(".mjs")) return { cmd: process.execPath, args: [p] };
      return { cmd: p, args: [] };
    }
  }
  // Last resort — use node with ts-node/esm or fall back to npx
  return { cmd: "npx", args: ["--yes", "tsx"] };
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
    const root = feedbackRoot();
    const { cmd, args: tsxArgs } = resolveTsxBin();
    const tsconfig = join(root, "tsconfig.json");
    try {
      await new Promise<void>((resolve, reject) => {
      const child = spawn(
        cmd,
        [...tsxArgs, scriptPath, inputPath, outputPath],
        {
          cwd: root,
          env: {
            ...process.env,
            TSX_TSCONFIG_PATH: existsSync(tsconfig) ? tsconfig : undefined,
          },
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
