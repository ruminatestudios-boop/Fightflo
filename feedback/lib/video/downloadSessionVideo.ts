import { apiPath } from "@/lib/paths";
import {
  collectLandmarkTimelineFromVideo,
} from "@/lib/video/collectBrowserLandmarks";
import {
  countDrawableLandmarkFrames,
  hasExportableLandmarks,
} from "@/components/video/landmarkPlayback";
import type { LandmarkTimeline } from "@/types";

export class DownloadSessionVideoError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "DownloadSessionVideoError";
    this.code = code;
  }
}

export interface DownloadProgressUpdate {
  message: string;
  percent: number;
  secondsRemaining: number;
}

export interface DownloadSessionVideoOptions {
  video?: HTMLVideoElement | null;
}

const ESTIMATED_TOTAL_SEC = 150;

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

async function parseDownloadError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return body.error ?? `Download failed (${response.status})`;
  }
  const text = await response.text().catch(() => "");
  return text.trim() || `Download failed (${response.status})`;
}

async function loadSessionVideo(sessionId: string): Promise<HTMLVideoElement> {
  const res = await fetch(apiPath(`/api/video?sessionId=${sessionId}`));
  if (!res.ok) {
    throw new DownloadSessionVideoError("Could not load video for pose sampling");
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";

    const onReady = () => {
      cleanup();
      resolve(video);
    };
    const onError = () => {
      cleanup();
      URL.revokeObjectURL(objectUrl);
      reject(new DownloadSessionVideoError("Could not load video for pose sampling"));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);
    video.src = objectUrl;
    video.load();
  });
}

function createProgressReporter(
  onProgress?: (update: DownloadProgressUpdate) => void
) {
  let burnTimer: ReturnType<typeof setInterval> | null = null;

  const emit = (percent: number, message: string) => {
    const clamped = Math.min(99, Math.max(0, percent));
    const secondsRemaining = Math.max(
      0,
      Math.round(ESTIMATED_TOTAL_SEC * (1 - clamped / 100))
    );
    onProgress?.({ message, percent: clamped, secondsRemaining });
  };

  const onLandmarkMessage = (message: string) => {
    const match = message.match(/(\d+)%/);
    if (match) {
      const sub = Number(match[1]);
      emit(5 + (sub / 100) * 38, message);
      return;
    }
    if (message.includes("Loading video")) {
      emit(3, message);
      return;
    }
    emit(5, message);
  };

  const startBurnProgress = () => {
    const burnStart = Date.now();
    const burnBudgetSec = 95;
    emit(45, "Burning skeleton into your video…");

    burnTimer = setInterval(() => {
      const elapsed = (Date.now() - burnStart) / 1000;
      const burnPct = Math.min(1, elapsed / burnBudgetSec);
      const total = 45 + burnPct * 48;
      const secLeft = Math.max(3, Math.round(burnBudgetSec - elapsed));
      emit(
        total,
        `Burning skeleton into your video — ~${secLeft}s left`
      );
    }, 400);
  };

  const stopBurnProgress = () => {
    if (burnTimer) {
      clearInterval(burnTimer);
      burnTimer = null;
    }
  };

  return { emit, onLandmarkMessage, startBurnProgress, stopBurnProgress };
}

async function collectFreshLandmarks(
  sessionId: string,
  options: DownloadSessionVideoOptions | undefined,
  onLandmarkMessage: (message: string) => void
): Promise<{
  timeline: LandmarkTimeline;
  videoWidth: number;
  videoHeight: number;
}> {
  const inline = options?.video ?? null;
  if (inline && inline.readyState >= 2 && inline.duration > 0) {
    onLandmarkMessage("Reading your movement in the browser…");
    const result = await collectLandmarkTimelineFromVideo(
      inline,
      onLandmarkMessage
    );
    return { ...result.meta, timeline: result.timeline };
  }

  onLandmarkMessage("Loading video for pose sampling…");
  const tempVideo = await loadSessionVideo(sessionId);
  try {
    onLandmarkMessage("Reading your movement in the browser…");
    const result = await collectLandmarkTimelineFromVideo(
      tempVideo,
      onLandmarkMessage
    );
    return { ...result.meta, timeline: result.timeline };
  } finally {
    const src = tempVideo.src;
    tempVideo.removeAttribute("src");
    tempVideo.load();
    if (src.startsWith("blob:")) URL.revokeObjectURL(src);
  }
}

function assertExportableTimeline(timeline: LandmarkTimeline): void {
  if (hasExportableLandmarks(timeline)) return;

  const withPose = timeline.filter(
    (f) => f.landmarks && Object.keys(f.landmarks).length > 0
  ).length;

  if (withPose === 0) {
    throw new DownloadSessionVideoError(
      "Could not detect your body in this video. Open the report, keep your full body in frame, then try download again."
    );
  }

  throw new DownloadSessionVideoError(
    `Pose tracking was too limited (${countDrawableLandmarkFrames(timeline)} usable frames). Re-film with your full body visible in good lighting.`
  );
}

/** Download overlay video — always rebuilds with fresh browser pose data. */
export async function downloadSessionVideo(
  sessionId: string,
  userId: string,
  onProgress?: (update: DownloadProgressUpdate) => void,
  options?: DownloadSessionVideoOptions
): Promise<void> {
  const progress = createProgressReporter(onProgress);

  progress.emit(2, "Reading your movement in the browser…");

  const { timeline, videoWidth, videoHeight } = await collectFreshLandmarks(
    sessionId,
    options,
    progress.onLandmarkMessage
  );
  assertExportableTimeline(timeline);

  progress.startBurnProgress();

  let response: Response;
  try {
    response = await fetch(apiPath("/api/video/download"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        userId,
        rebuild: true,
        landmarkTimeline: timeline,
        videoWidth,
        videoHeight,
      }),
    });
  } finally {
    progress.stopBurnProgress();
  }

  if (response.status === 402) {
    throw new DownloadSessionVideoError("Pro plan required", "PRO_REQUIRED");
  }

  if (!response.ok) {
    throw new DownloadSessionVideoError(await parseDownloadError(response));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("video") && !contentType.includes("octet-stream")) {
    throw new DownloadSessionVideoError(
      "Export did not return a video file — keep your full body in frame and try again"
    );
  }

  progress.emit(94, "Saving to your device…");

  const blob = await response.blob();
  if (blob.size < 1024) {
    throw new DownloadSessionVideoError(
      "Export file was empty — keep your full body in frame and try again"
    );
  }

  progress.emit(100, "Download ready");
  triggerBlobDownload(blob, `fightflo-${sessionId.slice(0, 8)}.mp4`);
}
