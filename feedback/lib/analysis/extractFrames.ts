import { mkdir, readdir, readFile, rm, writeFile, copyFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { isAbsolute } from "path";
import ffmpeg from "fluent-ffmpeg";
import { configureFfmpeg } from "@/lib/config/ffmpeg";
import {
  FRAMES_PER_SECOND,
  frameToTimestamp,
  parseTimestamp,
} from "@/lib/analysis/timestamps";

export { FRAMES_PER_SECOND, frameToTimestamp, parseTimestamp };

async function materializeVideo(
  videoUrl: string,
  destPath: string
): Promise<void> {
  if (
    videoUrl.startsWith("http://") ||
    videoUrl.startsWith("https://")
  ) {
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    await writeFile(destPath, buffer);
    return;
  }

  if (isAbsolute(videoUrl)) {
    await copyFile(videoUrl, destPath);
    return;
  }

  throw new Error(`Unsupported video URL: ${videoUrl}`);
}

export async function extractFrames(
  videoUrl: string,
  sessionId: string
): Promise<string[]> {
  const sessionDir = join(tmpdir(), "feedback-frames", sessionId);
  await mkdir(sessionDir, { recursive: true });

  const videoPath = join(sessionDir, "source.mp4");
  await materializeVideo(videoUrl, videoPath);

  configureFfmpeg();
  const outputPattern = join(sessionDir, "frame_%04d.jpg");

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-vf fps=${FRAMES_PER_SECOND}`])
      .output(outputPattern)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  const files = await readdir(sessionDir);
  return files
    .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
    .sort()
    .map((f) => join(sessionDir, f));
}

export async function extractClip(
  videoUrl: string,
  sessionId: string,
  timestampSeconds: number,
  label: string
): Promise<string> {
  const sessionDir = join(tmpdir(), "feedback-clips", sessionId);
  await mkdir(sessionDir, { recursive: true });

  const videoPath = join(sessionDir, "source.mp4");
  const clipPath = join(sessionDir, `${label}.mp4`);

  const exists = await readFile(videoPath).catch(() => null);
  if (!exists) {
    await materializeVideo(videoUrl, videoPath);
  }

  const start = Math.max(0, timestampSeconds - 1);

  configureFfmpeg();

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(start)
      .setDuration(3)
      .output(clipPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  return clipPath;
}

export async function cleanupSessionFiles(sessionId: string): Promise<void> {
  const framesDir = join(tmpdir(), "feedback-frames", sessionId);
  const clipsDir = join(tmpdir(), "feedback-clips", sessionId);
  await rm(framesDir, { recursive: true, force: true });
  await rm(clipsDir, { recursive: true, force: true });
}

export async function readFrameAsBase64(framePath: string): Promise<string> {
  const buffer = await readFile(framePath);
  return buffer.toString("base64");
}
