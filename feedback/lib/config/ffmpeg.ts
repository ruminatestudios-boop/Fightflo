import { accessSync, constants, existsSync } from "fs";
import { execSync } from "child_process";
import { homedir, platform, arch } from "os";
import { dirname, join } from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

let resolvedFfmpegPath: string | null = null;
let resolvedFfprobePath: string | null = null;

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return existsSync(path);
  }
}

function getBundledFfmpegPath(): string | null {
  // Static import path (works locally and sometimes in Vercel)
  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic;

  // Dynamic require bypasses Next.js static analysis — more reliable in Vercel lambdas
  try {
    const p = (eval("require") as NodeRequire)("ffmpeg-static") as string | null; // eslint-disable-line
    if (p && existsSync(p)) return p;
  } catch { /* not available */ }

  const os = platform();
  const cpu = arch();
  const name = os === "win32" ? "ffmpeg.exe" : "ffmpeg";

  // Vercel lambda paths (/var/task is the lambda root)
  const roots = [
    "/var/task",
    "/var/task/.next/server",
    process.cwd(),
    join(process.cwd(), ".next/server"),
    join(process.cwd(), "feedback"),
    dirname(dirname(dirname(__dirname))), // traverse up from lib/config/ffmpeg.ts
  ];

  for (const root of roots) {
    const candidate = join(root, "node_modules", "ffmpeg-static", name);
    if (existsSync(candidate)) return candidate;
    const nested = join(root, "node_modules", "ffmpeg-static", "bin", os, cpu, name);
    if (existsSync(nested)) return nested;
  }

  return null;
}

/** Resolve ffmpeg binary — Next.js server often lacks shell PATH */
export function getFfmpegPath(): string {
  if (resolvedFfmpegPath) return resolvedFfmpegPath;

  const candidates = [
    process.env.FFMPEG_PATH,
    getBundledFfmpegPath(),
    join(homedir(), "bin", "ffmpeg"),
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      resolvedFfmpegPath = candidate;
      ffmpeg.setFfmpegPath(candidate);
      return candidate;
    }
  }

  try {
    const found = execSync("which ffmpeg", { encoding: "utf8" }).trim();
    if (found && isExecutable(found)) {
      resolvedFfmpegPath = found;
      ffmpeg.setFfmpegPath(found);
      return found;
    }
  } catch {
    /* not on PATH */
  }

  throw new Error(
    "Cannot find ffmpeg. Install to ~/bin/ffmpeg or set FFMPEG_PATH in .env"
  );
}

/** Optional — fluent-ffmpeg falls back to PATH when unset */
export function getFfprobePath(ffmpegPath?: string): string | null {
  if (resolvedFfprobePath) return resolvedFfprobePath;

  const ffmpegDir = ffmpegPath ? dirname(ffmpegPath) : null;
  const candidates = [
    process.env.FFPROBE_PATH,
    ffmpegDir ? join(ffmpegDir, "ffprobe") : null,
    join(homedir(), "bin", "ffprobe"),
    "/opt/homebrew/bin/ffprobe",
    "/usr/local/bin/ffprobe",
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      resolvedFfprobePath = candidate;
      ffmpeg.setFfprobePath(candidate);
      return candidate;
    }
  }

  try {
    const found = execSync("which ffprobe", { encoding: "utf8" }).trim();
    if (found && isExecutable(found)) {
      resolvedFfprobePath = found;
      ffmpeg.setFfprobePath(found);
      return found;
    }
  } catch {
    /* not on PATH */
  }

  return null;
}

export function configureFfmpeg(): void {
  const ffmpegPath = getFfmpegPath();
  getFfprobePath(ffmpegPath);
}
