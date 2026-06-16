"use client";

export type CameraFacing = "user" | "environment";

/** Max live record length — 3 minute round */
export const MAX_LIVE_RECORD_SECONDS = 180;

export async function startCameraStream(
  facingMode: CameraFacing = "environment"
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera not supported in this browser");
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Camera stream failed to load"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function isPlayInterrupted(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "AbortError" ||
    error.message.includes("interrupted") ||
    error.message.includes("new load request")
  );
}

export async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
  isCancelled?: () => boolean
): Promise<void> {
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");

  video.pause();

  const previous = video.srcObject;
  if (previous instanceof MediaStream && previous !== stream) {
    previous.getTracks().forEach((track) => track.stop());
  }

  video.srcObject = stream;

  await waitForVideoMetadata(video);
  if (isCancelled?.()) return;

  try {
    await video.play();
  } catch (error) {
    if (isCancelled?.() || isPlayInterrupted(error)) return;
    throw error;
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function detachVideoStream(video: HTMLVideoElement | null): void {
  if (!video) return;
  video.pause();
  const stream = video.srcObject;
  if (stream instanceof MediaStream) {
    stopMediaStream(stream);
  }
  video.srcObject = null;
}

export function pickRecorderMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export function extensionForMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}
