"use client";

import { sportsCameraVideoConstraints } from "@/lib/pose/mediapipeConfig";

export type CameraFacing = "user" | "environment";

/** Max live record length — 3 minute round */
export const MAX_LIVE_RECORD_SECONDS = 180;

const CAMERA_RELEASE_MS = 200;

let managedStream: MediaStream | null = null;
let startQueue: Promise<void> = Promise.resolve();

function isPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  const message = error.message.toLowerCase();
  return (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    message.includes("permission") ||
    message.includes("not allowed")
  );
}

function isCameraBusyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  const message = error.message.toLowerCase();
  return (
    name === "NotReadableError" ||
    name === "TrackStartError" ||
    message.includes("video source") ||
    message.includes("could not start") ||
    message.includes("in use") ||
    message.includes("busy")
  );
}

export function formatCameraError(error: unknown): string {
  if (isPermissionError(error)) {
    return "Camera permission denied — allow camera in browser settings.";
  }
  if (isCameraBusyError(error)) {
    return "Camera is busy — close other tabs or apps using the camera, wait a moment, then tap Try again.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not access camera";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function stopStreamTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      /* already stopped */
    }
  });
}

async function releaseManagedCamera(): Promise<void> {
  if (!managedStream) return;
  stopStreamTracks(managedStream);
  managedStream = null;
  await wait(CAMERA_RELEASE_MS);
}

async function requestCameraStream(
  facingMode: CameraFacing
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera not supported in this browser");
  }

  const attempts: MediaStreamConstraints[] = [
    {
      video: sportsCameraVideoConstraints(facingMode),
      audio: false,
    },
    {
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    },
    { video: true, audio: false },
  ];

  let lastError: unknown;

  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      if (isPermissionError(error)) throw error;
    }
  }

  if (isCameraBusyError(lastError)) {
    await wait(CAMERA_RELEASE_MS);
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
    } catch (retryError) {
      throw retryError;
    }
  }

  throw lastError ?? new Error("Could not access camera");
}

export async function startCameraStream(
  facingMode: CameraFacing = "environment"
): Promise<MediaStream> {
  const run = async () => {
    await releaseManagedCamera();
    const stream = await requestCameraStream(facingMode);
    managedStream = stream;
    return stream;
  };

  const promise = startQueue.then(run);
  startQueue = promise.then(
    () => undefined,
    () => undefined
  );
  return promise;
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
    stopStreamTracks(previous);
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
  stopStreamTracks(stream);
  if (stream && stream === managedStream) {
    managedStream = null;
  }
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
