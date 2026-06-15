import { spawn } from "child_process";
import { getFfmpegPath } from "@/lib/config/ffmpeg";

export interface VideoProbe {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

function parseFps(rate: string | undefined): number {
  if (!rate) return 30;
  const parts = rate.split("/").map(Number);
  if (parts.length === 2 && parts[1] > 0) return parts[0] / parts[1];
  const n = Number(rate);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/** Probe via `ffmpeg -i` stderr — avoids bundling ffprobe-static on Vercel. */
export function probeVideo(path: string): Promise<VideoProbe> {
  const ffmpegPath = getFfmpegPath();

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ["-hide_banner", "-i", path], {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && code !== 1 && !stderr.includes("Duration:")) {
        reject(new Error(stderr.trim() || `ffmpeg probe failed (${code})`));
        return;
      }

      const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      const streamMatch = stderr.match(
        /Stream #\d+:\d+(?:\([^)]+\))?: Video:[^\n]*?(\d{2,5})x(\d{2,5})/
      );
      const fpsMatch =
        stderr.match(/(\d+(?:\.\d+)?)\s*fps/) ??
        stderr.match(/(\d+(?:\.\d+)?)\s*tb\(r\)/);

      if (!durationMatch) {
        reject(new Error("Could not read video duration"));
        return;
      }

      const hours = Number(durationMatch[1]);
      const minutes = Number(durationMatch[2]);
      const seconds = Number(durationMatch[3]);
      const duration = hours * 3600 + minutes * 60 + seconds;
      const fps = parseFps(fpsMatch?.[1]);

      resolve({
        width: streamMatch ? Number(streamMatch[1]) : 1280,
        height: streamMatch ? Number(streamMatch[2]) : 720,
        fps: Math.min(30, Math.max(12, Math.round(fps * 100) / 100)),
        duration,
      });
    });
  });
}
