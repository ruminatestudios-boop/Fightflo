import { accessSync, constants, existsSync } from "fs";
import { execSync } from "child_process";
import { arch, homedir, platform } from "os";
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

/** ffprobe-static breaks when webpack bundles __dirname — resolve from app root */
function getBundledFfprobePath(): string {
  const os = platform();
  const cpu = arch();
  const name = os === "win32" ? "ffprobe.exe" : "ffprobe";
  const roots = [process.cwd(), join(process.cwd(), "feedback")];

  for (const root of roots) {
    const candidate = join(root, "node_modules", "ffprobe-static", "bin", os, cpu, name);
    if (existsSync(candidate)) return candidate;
  }

  return join(process.cwd(), "node_modules", "ffprobe-static", "bin", os, cpu, name);
}

function getBundledFfmpegPath(): string | null {
  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic;

  const os = platform();
  const cpu = arch();
  const name = os === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const roots = [process.cwd(), join(process.cwd(), "feedback")];

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

/** Resolve ffprobe — required for video export and analysis */
export function getFfprobePath(ffmpegPath?: string): string {
  if (resolvedFfprobePath) return resolvedFfprobePath;

  const ffmpegDir = ffmpegPath ? dirname(ffmpegPath) : null;
  const candidates = [
    process.env.FFPROBE_PATH,
    ffmpegDir ? join(ffmpegDir, "ffprobe") : null,
    join(homedir(), "bin", "ffprobe"),
    "/opt/homebrew/bin/ffprobe",
    "/usr/local/bin/ffprobe",
    getBundledFfprobePath(),
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

  throw new Error(
    "Cannot find ffprobe. Install ffmpeg (includes ffprobe), copy ffprobe to ~/bin/, or set FFPROBE_PATH in .env"
  );
}

export function configureFfmpeg(): void {
  const ffmpegPath = getFfmpegPath();
  getFfprobePath(ffmpegPath);
}
