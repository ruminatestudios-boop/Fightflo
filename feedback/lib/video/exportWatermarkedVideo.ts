import { mkdir, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import ffmpeg from "fluent-ffmpeg";
import { configureFfmpeg } from "@/lib/config/ffmpeg";
import { materializeVideoToPath } from "@/lib/video/materializeVideo";

const WATERMARK_FILTER =
  "drawtext=text='FIGHTFLO.':fontcolor=white@0.82:fontsize=32:x=(w-tw)/2:y=h-th-28:shadowcolor=black@0.55:shadowx=2:shadowy=2";

/** Export session video with FIGHTFLO. watermark burned in (Pro downloads). */
export async function exportWatermarkedVideo(
  videoUrl: string,
  sessionId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const workDir = join(tmpdir(), "feedback-export", sessionId);
  await mkdir(workDir, { recursive: true });

  const sourcePath = join(workDir, "source.mp4");
  const outputPath = join(workDir, "feedback-export.mp4");

  await materializeVideoToPath(videoUrl, sourcePath);

  configureFfmpeg();

  await new Promise<void>((resolve, reject) => {
    ffmpeg(sourcePath)
      .videoFilters([WATERMARK_FILTER])
      .outputOptions(["-c:a", "copy", "-movflags", "+faststart"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  const buffer = await readFile(outputPath);
  return {
    buffer,
    filename: `feedback-${sessionId.slice(0, 8)}.mp4`,
  };
}
