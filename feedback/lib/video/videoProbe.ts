import ffmpeg from "fluent-ffmpeg";
import { configureFfmpeg } from "@/lib/config/ffmpeg";

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

export function probeVideo(path: string): Promise<VideoProbe> {
  configureFfmpeg();
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const stream = data.streams.find((s) => s.codec_type === "video");
      if (!stream) {
        reject(new Error("No video stream found"));
        return;
      }
      const fps = parseFps(stream.r_frame_rate ?? stream.avg_frame_rate);
      resolve({
        width: stream.width ?? 1280,
        height: stream.height ?? 720,
        fps: Math.min(30, Math.max(12, Math.round(fps * 100) / 100)),
        duration: data.format.duration ?? 0,
      });
    });
  });
}
