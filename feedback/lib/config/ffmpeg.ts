import { accessSync, constants } from "fs";
import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import ffmpeg from "fluent-ffmpeg";

let resolvedPath: string | null = null;

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Resolve ffmpeg binary — Next.js server often lacks shell PATH */
export function getFfmpegPath(): string {
  if (resolvedPath) return resolvedPath;

  const candidates = [
    process.env.FFMPEG_PATH,
    join(homedir(), "bin", "ffmpeg"),
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      resolvedPath = candidate;
      ffmpeg.setFfmpegPath(candidate);
      return candidate;
    }
  }

  try {
    const found = execSync("which ffmpeg", { encoding: "utf8" }).trim();
    if (found && isExecutable(found)) {
      resolvedPath = found;
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

export function configureFfmpeg(): void {
  getFfmpegPath();
}
