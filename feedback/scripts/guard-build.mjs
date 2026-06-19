#!/usr/bin/env node
/** Warn when production build runs while dev server still owns port 3001.
 *  Also pre-compiles the pose detection subprocess to a plain JS bundle
 *  so it can run with node (no tsx, no tsconfig path alias resolution). */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const port = process.env.PORT ?? "3001";

try {
  const pids = execSync(`lsof -ti:${port}`, { encoding: "utf8" }).trim();
  if (!pids) {
    // port free — fall through
  } else {
    console.warn(
      [
        "",
        `⚠️  Port ${port} is in use (pid ${pids.replace(/\n/g, ", ")}).`,
        "   Running \`npm run build\` while \`npm run dev\` is active corrupts .next",
        "   and causes errors like: Cannot find module './948.js'",
        "",
        "   Stop dev first (Ctrl+C), or run: npm run dev:clean",
        "",
      ].join("\n")
    );
  }
} catch {
  /* port free */
}

// Pre-compile the subprocess so the lambda runs plain node (no tsx needed).
const entry = resolve(root, "scripts/detect-pose-cli.ts");
const out = resolve(root, "scripts/detect-pose-cli.cjs");

if (existsSync(entry)) {
  console.log("  Building pose subprocess bundle...");
  try {
    execSync(
      `node_modules/.bin/esbuild ${entry} --bundle --platform=node --target=node18 --format=cjs --outfile=${out} --external:@mediapipe/tasks-vision --external:@napi-rs/canvas --external:ffmpeg-static --external:fluent-ffmpeg`,
      { cwd: root, stdio: "inherit" }
    );
    console.log("  ✓ scripts/detect-pose-cli.cjs built\n");
  } catch (e) {
    console.error("  ✗ Failed to build pose subprocess:", e.message);
    process.exit(1);
  }
}
