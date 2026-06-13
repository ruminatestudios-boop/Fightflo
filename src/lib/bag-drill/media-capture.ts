export interface MediaCaptureHandles {
  stream: MediaStream | null;
  videoEl: HTMLVideoElement | null;
  audioContext: AudioContext | null;
  stop: () => void;
}

export interface MediaCaptureResult {
  handles: MediaCaptureHandles;
  hasCamera: boolean;
  hasMic: boolean;
  error: string | null;
}

function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export interface MediaCaptureOptions {
  /** `environment` = rear/bag cam, `user` = front/fighter cam */
  facingMode?: "environment" | "user";
  /** Fighter cam uses higher resolution for AI accuracy */
  highQuality?: boolean;
  /** When false, only opens camera — mic is added via `appendMicrophoneToCapture` */
  requestMicrophone?: boolean;
}

type FacingMode = "environment" | "user";

type GumFailure = { name: string; message: string };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isAndroidDevice(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroid(): boolean {
  return isAndroidDevice();
}

function pickVideoFailure(failures: GumFailure[]): GumFailure | null {
  if (!failures.length) return null;
  const rank: Record<string, number> = {
    NotAllowedError: 0,
    PermissionDeniedError: 0,
    SecurityError: 1,
    NotFoundError: 2,
    DevicesNotFoundError: 2,
    OverconstrainedError: 3,
    ConstraintNotSatisfiedError: 3,
    NotReadableError: 4,
    TrackStartError: 4,
    AbortError: 4,
  };
  return [...failures].sort(
    (a, b) => (rank[a.name] ?? 9) - (rank[b.name] ?? 9)
  )[0];
}

function hasLiveAudio(stream: MediaStream): boolean {
  return stream
    .getAudioTracks()
    .some((track) => track.readyState === "live" && track.enabled);
}

function hasLiveVideo(stream: MediaStream): boolean {
  return stream
    .getVideoTracks()
    .some((track) => track.readyState === "live" && track.enabled);
}

export function hasLiveMicrophone(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  return hasLiveAudio(stream);
}

export interface MicLevelMonitor {
  getLevel: () => number;
  stop: () => void;
}

export interface MicLevelMonitorOptions {
  onPeak?: (peak: number) => void;
  peakThreshold?: number;
}

/** Live mic level for setup UI — time-domain peaks, optional impact flash callback. */
export function createMicLevelMonitor(
  stream: MediaStream,
  options: MicLevelMonitorOptions = {}
): MicLevelMonitor | null {
  if (!hasLiveAudio(stream)) return null;

  const peakThreshold = options.peakThreshold ?? 0.18;
  let currentLevel = 0;
  let cooldown = false;

  try {
    const audioContext = new AudioContext();
    void audioContext.resume();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    const id = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      currentLevel = peak;
      if (peak >= peakThreshold && !cooldown) {
        cooldown = true;
        options.onPeak?.(peak);
        window.setTimeout(() => {
          cooldown = false;
        }, 220);
      }
    }, 40);

    return {
      getLevel: () => currentLevel,
      stop: () => {
        window.clearInterval(id);
        source.disconnect();
        void audioContext.close();
      },
    };
  } catch {
    return null;
  }
}

function gumErrorMessage(failure: GumFailure | null, kind: "video" | "audio"): string {
  if (!failure) {
    return kind === "video"
      ? "Camera unavailable — tap Allow below, or enable Camera in Settings → Safari"
      : "Microphone blocked — tap Allow below and enable Mic for fightflo.app in Settings";
  }
  if (failure.name === "NotAllowedError" || failure.name === "PermissionDeniedError") {
    return kind === "video"
      ? isAndroid()
        ? "Camera blocked — tap Allow on the popup, or Chrome ⋮ → Site settings → Camera → Allow"
        : isIOSDevice()
          ? "Camera blocked — tap Allow on the popup, or aA → Website Settings → Camera → Allow"
          : "Camera blocked — tap Allow when prompted, or enable Camera for fightflo.app in Settings"
      : isAndroid()
        ? "Mic blocked — tap Allow on the popup, or Chrome ⋮ → Site settings → Microphone → Allow"
        : isIOSDevice()
          ? "Mic blocked — tap Allow on the popup, or aA → Website Settings → Microphone → Allow"
          : "Microphone blocked — tap Allow when prompted, or enable Mic for fightflo.app in Settings";
  }
  if (failure.name === "NotFoundError" || failure.name === "DevicesNotFoundError") {
    return kind === "video"
      ? "No camera found — try another device or browser"
      : "No microphone found — try another device or browser";
  }
  if (
    failure.name === "NotReadableError" ||
    failure.name === "TrackStartError" ||
    failure.name === "AbortError"
  ) {
    if (kind === "video" && isAndroid()) {
      return "Camera busy — close other camera apps, tap Retry, or Chrome ⋮ → Site settings → Camera → Allow";
    }
    return kind === "video"
      ? "Camera in use — close other apps using the camera, then tap Retry"
      : "Microphone in use — close other apps using the mic, then tap Retry";
  }
  if (failure.name === "OverconstrainedError" || failure.name === "ConstraintNotSatisfiedError") {
    return kind === "video"
      ? "Camera mode not supported — tap Retry or switch You / Bag"
      : "Microphone settings not supported — tap Retry";
  }
  return kind === "video"
    ? isAndroid()
      ? "Camera unavailable — tap Allow below, or Chrome ⋮ → Site settings → Camera → Allow"
      : "Camera unavailable — tap Allow below, or enable Camera in Settings → Safari"
    : "Microphone blocked — tap Allow below and enable Mic for fightflo.app in Settings";
}

/** Stop any tracks bound to a preview element (Android needs this before re-open). */
export function releaseVideoPreview(videoEl: HTMLVideoElement | null): void {
  const stream = videoEl?.srcObject;
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (videoEl) {
    videoEl.srcObject = null;
  }
}

/** Retry playback after iOS blocks autoplay — call from a tap handler. */
export async function retryVideoPlay(
  videoEl: HTMLVideoElement | null
): Promise<boolean> {
  if (!videoEl?.srcObject) return false;
  try {
    await videoEl.play();
    return true;
  } catch {
    return false;
  }
}

/** Detach preview without stopping tracks — safe when reusing a shared MediaStream. */
export function detachVideoPreview(videoEl: HTMLVideoElement | null): void {
  if (videoEl) {
    videoEl.srcObject = null;
  }
}

async function queryPermission(kind: "camera" | "microphone"): Promise<PermissionState | null> {
  try {
    const result = await navigator.permissions.query({ name: kind });
    return result.state;
  } catch {
    return null;
  }
}

async function attachStreamToVideo(
  videoEl: HTMLVideoElement,
  stream: MediaStream
): Promise<void> {
  videoEl.srcObject = stream;
  videoEl.muted = true;
  videoEl.setAttribute("playsinline", "true");
  videoEl.setAttribute("webkit-playsinline", "true");
  await videoEl.play();
}

async function tryGetUserMedia(
  constraints: MediaStreamConstraints
): Promise<{ stream: MediaStream | null; failure: GumFailure | null }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, failure: null };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { stream, failure: null };
  } catch (err) {
    const failure =
      err instanceof DOMException
        ? { name: err.name, message: err.message }
        : err instanceof Error
          ? { name: err.name, message: err.message }
          : null;
    return { stream: null, failure };
  }
}

async function attachMicrophone(stream: MediaStream): Promise<boolean> {
  if (stream.getAudioTracks().some((t) => t.readyState === "live")) {
    return true;
  }

  const attempts: MediaStreamConstraints[] = [
    { audio: true },
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    },
    {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    },
  ];

  for (const constraints of attempts) {
    const { stream: audioStream } = await tryGetUserMedia(constraints);
    const track = audioStream?.getAudioTracks()[0];
    if (track) {
      stream.addTrack(track);
      return true;
    }
    audioStream?.getTracks().forEach((t) => t.stop());
  }

  return false;
}

/** One or two video-only attempts per tap — Android locks if we hammer getUserMedia. */
async function openVideoStream(
  facingMode: FacingMode,
  highQuality: boolean
): Promise<{ stream: MediaStream | null; videoFailure: GumFailure | null }> {
  const androidAttempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: facingMode } } },
    { video: { facingMode: facingMode } },
    { video: true },
  ];
  const desktopAttempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: facingMode } } },
    { video: true },
    {
      video: highQuality
        ? { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: facingMode }, width: { ideal: 640 }, height: { ideal: 480 } },
    },
    { video: { facingMode: "user" } },
    { video: { facingMode: { exact: facingMode } } },
  ];

  const attempts = isAndroid() ? androidAttempts : desktopAttempts;
  const failures: GumFailure[] = [];

  for (let i = 0; i < attempts.length; i++) {
    const constraints = attempts[i];
    const { stream, failure } = await tryGetUserMedia(constraints);
    if (failure) {
      failures.push(failure);
      if (
        failure.name === "NotAllowedError" ||
        failure.name === "PermissionDeniedError" ||
        failure.name === "SecurityError"
      ) {
        break;
      }
      if (
        failure.name === "NotReadableError" ||
        failure.name === "TrackStartError" ||
        failure.name === "AbortError"
      ) {
        await delay(isAndroid() ? 350 : 120);
      }
    }
    if (stream?.getVideoTracks().length) {
      return { stream, videoFailure: null };
    }
    stream?.getTracks().forEach((t) => t.stop());
  }

  return { stream: null, videoFailure: pickVideoFailure(failures) };
}

/** iOS Safari needs camera + mic in one getUserMedia call — separate audio calls are blocked. */
async function openCombinedAvStream(
  facingMode: FacingMode,
  highQuality: boolean
): Promise<{ stream: MediaStream | null; failure: GumFailure | null }> {
  const attempts: MediaStreamConstraints[] = [
    {
      video: { facingMode: { ideal: facingMode } },
      audio: true,
    },
    {
      video: { facingMode },
      audio: true,
    },
    {
      video: true,
      audio: true,
    },
    {
      video: highQuality
        ? { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: facingMode }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    },
  ];

  const failures: GumFailure[] = [];

  for (let i = 0; i < attempts.length; i++) {
    const { stream, failure } = await tryGetUserMedia(attempts[i]);
    if (failure) {
      failures.push(failure);
      if (
        failure.name === "NotAllowedError" ||
        failure.name === "PermissionDeniedError" ||
        failure.name === "SecurityError"
      ) {
        break;
      }
    }
    if (stream?.getVideoTracks().length) {
      return { stream, failure: null };
    }
    stream?.getTracks().forEach((track) => track.stop());
    if (i < attempts.length - 1) {
      await delay(isAndroid() ? 200 : 80);
    }
  }

  return { stream: null, failure: pickVideoFailure(failures) };
}

/** Re-open capture with mic — required on iOS when the first stream was video-only. */
export async function reacquireMediaWithMicrophone(
  videoEl: HTMLVideoElement,
  facingMode: FacingMode = "user",
  existingStream: MediaStream | null = null
): Promise<MediaCaptureResult> {
  existingStream?.getTracks().forEach((track) => track.stop());
  releaseVideoPreview(videoEl);
  await delay(isIOSDevice() ? 120 : 60);
  return startMediaCapture(videoEl, {
    facingMode,
    highQuality: false,
    requestMicrophone: true,
  });
}

async function initAudioContext(
  stream: MediaStream
): Promise<AudioContext | null> {
  if (!stream.getAudioTracks().length) return null;
  try {
    const ctx = new AudioContext({ sampleRate: 16000 });
    await ctx.resume();
    return ctx;
  } catch {
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }
}

export async function appendMicrophoneToCapture(
  handles: MediaCaptureHandles
): Promise<{ hasMic: boolean; error: string | null }> {
  if (!handles.stream) {
    return { hasMic: false, error: gumErrorMessage(null, "audio") };
  }
  if (!hasLiveAudio(handles.stream)) {
    await attachMicrophone(handles.stream);
  }
  const hasMic = hasLiveAudio(handles.stream);
  if (hasMic) {
    handles.audioContext = await initAudioContext(handles.stream);
  }
  return {
    hasMic,
    error: hasMic ? null : gumErrorMessage(null, "audio"),
  };
}

export async function startMediaCapture(
  videoEl: HTMLVideoElement,
  options: MediaCaptureOptions = {}
): Promise<MediaCaptureResult> {
  const facingMode = options.facingMode ?? "user";
  const highQuality = options.highQuality ?? facingMode === "user";
  const requestMicrophone = options.requestMicrophone ?? true;
  const handles: MediaCaptureHandles = {
    stream: null,
    videoEl,
    audioContext: null,
    stop: () => {},
  };

  let hasCamera = false;
  let hasMic = false;
  let error: string | null = null;

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      handles,
      hasCamera: false,
      hasMic: false,
      error: "Camera needs HTTPS — open fightflo.app in Safari or Chrome",
    };
  }

  releaseVideoPreview(videoEl);
  await delay(isAndroid() ? 180 : 60);

  let stream: MediaStream | null = null;
  let videoFailure: GumFailure | null = null;

  if (requestMicrophone) {
    const combined = await openCombinedAvStream(facingMode, highQuality);
    stream = combined.stream;
    videoFailure = combined.failure;

    if (!stream && !isIOSDevice()) {
      const videoOnly = await openVideoStream(facingMode, highQuality);
      stream = videoOnly.stream;
      videoFailure = videoOnly.videoFailure;
    }
  } else {
    const videoOnly = await openVideoStream(facingMode, highQuality);
    stream = videoOnly.stream;
    videoFailure = videoOnly.videoFailure;
  }

  if (stream) {
    handles.stream = stream;
    hasCamera = hasLiveVideo(stream);
    hasMic = hasLiveAudio(stream);

    try {
      await attachStreamToVideo(videoEl, stream);
    } catch {
      error = "Camera on — tap the screen if preview is black";
    }

    if (requestMicrophone && !hasMic && !isIOSDevice()) {
      const mic = await appendMicrophoneToCapture(handles);
      hasMic = mic.hasMic;
      if (hasCamera && !hasMic) {
        error = mic.error;
      }
    } else if (requestMicrophone && hasMic) {
      handles.audioContext = await initAudioContext(stream);
    } else if (requestMicrophone && !hasMic) {
      error = gumErrorMessage(null, "audio");
    }
  } else {
    const cameraPermission = await queryPermission("camera");
    if (cameraPermission === "denied") {
      error = isAndroid()
        ? "Camera blocked — Chrome ⋮ → Site settings → Camera → Allow, then tap Retry"
        : gumErrorMessage(videoFailure, "video");
    } else if (
      !isAndroid() &&
      videoFailure?.name !== "NotAllowedError" &&
      videoFailure?.name !== "PermissionDeniedError"
    ) {
      const { stream: audioOnly } = await tryGetUserMedia({ audio: true });
      if (audioOnly) {
        handles.stream = audioOnly;
        hasMic = hasLiveAudio(audioOnly);
        error = gumErrorMessage(videoFailure, "video");
      } else {
        error = gumErrorMessage(videoFailure, "video");
      }
    } else {
      error = gumErrorMessage(videoFailure, "video");
    }
  }

  handles.stop = () => {
    handles.stream?.getTracks().forEach((t) => t.stop());
    void handles.audioContext?.close();
    handles.stream = null;
    handles.audioContext = null;
    if (videoEl) videoEl.srcObject = null;
  };

  return { handles, hasCamera, hasMic, error };
}

/** Reuse an open stream on the next screen (avoids a second iOS permission prompt). */
export async function attachExistingStream(
  videoEl: HTMLVideoElement,
  stream: MediaStream
): Promise<MediaCaptureResult> {
  const handles: MediaCaptureHandles = {
    stream,
    videoEl,
    audioContext: null,
    stop: () => {},
  };

  const hasCamera = hasLiveVideo(stream);
  if (!hasLiveAudio(stream)) {
    await attachMicrophone(stream);
  }
  const hasMic = hasLiveAudio(stream);
  let error: string | null = null;

  try {
    await attachStreamToVideo(videoEl, stream);
  } catch {
    error = "Camera on — tap the screen if preview is black";
  }

  if (!hasCamera) {
    error = gumErrorMessage(null, "video");
  } else if (!hasMic) {
    error = gumErrorMessage(null, "audio");
  }

  if (hasMic) {
    handles.audioContext = await initAudioContext(stream);
  }

  handles.stop = () => {
    void handles.audioContext?.close();
    handles.audioContext = null;
    if (videoEl) videoEl.srcObject = null;
  };

  return { handles, hasCamera, hasMic, error };
}

export function captureVideoFrame(
  videoEl: HTMLVideoElement,
  quality = 0.55
): Blob | null {
  if (!videoEl.videoWidth) return null;
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(videoEl, 0, 0);
  let blob: Blob | null = null;
  canvas.toBlob((b) => {
    blob = b;
  }, "image/jpeg", quality);
  return blob;
}

export async function captureVideoFrameAsync(
  videoEl: HTMLVideoElement,
  quality = 0.55
): Promise<Blob | null> {
  if (!videoEl.videoWidth) return null;
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(videoEl, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

export function createAudioProcessor(
  stream: MediaStream,
  audioContext: AudioContext,
  onPcmChunk: (pcm: ArrayBuffer) => void
): () => void {
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const ratio = audioContext.sampleRate / 16000;

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const outLen = Math.floor(input.length / ratio);
    const down = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      down[i] = input[Math.floor(i * ratio)];
    }
    onPcmChunk(floatTo16BitPCM(down));
  };

  const silent = audioContext.createGain();
  silent.gain.value = 0;
  source.connect(processor);
  processor.connect(silent);
  silent.connect(audioContext.destination);

  return () => {
    processor.disconnect();
    source.disconnect();
    silent.disconnect();
  };
}

export interface AudioImpactDetectorOptions {
  cooldownMs?: number;
  calibrateMs?: number;
  threshold?: number;
  onPeak?: (peak: number) => void;
}

export function createAudioImpactDetector(
  stream: MediaStream,
  audioContext: AudioContext,
  onImpact: () => void,
  options: AudioImpactDetectorOptions = {}
): () => void {
  const cooldownMs = options.cooldownMs ?? 130;
  const calibrateMs = options.calibrateMs ?? 2000;
  const presetThreshold = options.threshold;

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  let cooldown = false;
  const startedAt = Date.now();
  const noiseSamples: number[] = [];
  let threshold = presetThreshold ?? 0.22;
  const skipAutoCalibrate = presetThreshold != null;

  const id = window.setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i] - 128) / 128;
      if (v > peak) peak = v;
    }

    const elapsed = Date.now() - startedAt;
    if (!skipAutoCalibrate && elapsed < calibrateMs) {
      noiseSamples.push(peak);
      if (noiseSamples.length >= 8) {
        const sorted = [...noiseSamples].sort((a, b) => a - b);
        const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0.05;
        threshold = Math.max(0.14, Math.min(0.45, p90 * 3.2));
      }
      return;
    }

    if (peak > threshold && !cooldown) {
      cooldown = true;
      options.onPeak?.(peak);
      onImpact();
      window.setTimeout(() => {
        cooldown = false;
      }, cooldownMs);
    }
  }, 40);

  return () => {
    clearInterval(id);
    source.disconnect();
  };
}
