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
}

type FacingMode = "environment" | "user";

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
): Promise<MediaStream | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    return null;
  }
}

/** Progressive constraint ladder — mobile Safari often rejects bundled A/V or HD requests. */
async function openCameraStream(
  facingMode: FacingMode,
  highQuality: boolean
): Promise<MediaStream | null> {
  const audio: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };

  const attempts: MediaStreamConstraints[] = [
    {
      video: highQuality
        ? { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: facingMode }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio,
    },
    {
      video: { facingMode: { ideal: facingMode } },
      audio,
    },
    { video: { facingMode: { ideal: facingMode } } },
    { video: { facingMode: { exact: facingMode } } },
    { video: true, audio },
    { video: true },
    {
      video: { facingMode: { ideal: facingMode === "user" ? "environment" : "user" } },
    },
    { video: { facingMode: "user" } },
  ];

  for (const constraints of attempts) {
    const stream = await tryGetUserMedia(constraints);
    if (stream?.getVideoTracks().length) return stream;
    stream?.getTracks().forEach((t) => t.stop());
  }

  return null;
}

export async function startMediaCapture(
  videoEl: HTMLVideoElement,
  options: MediaCaptureOptions = {}
): Promise<MediaCaptureResult> {
  const facingMode = options.facingMode ?? "user";
  const highQuality = options.highQuality ?? facingMode === "user";
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

  const stream = await openCameraStream(facingMode, highQuality);

  if (stream) {
    handles.stream = stream;
    hasCamera = stream.getVideoTracks().length > 0;
    hasMic = stream.getAudioTracks().length > 0;
    try {
      await attachStreamToVideo(videoEl, stream);
    } catch {
      error = "Camera on — tap the screen if preview is black";
    }
    if (!hasMic) {
      error = "Microphone blocked — punch counting may be limited";
    }
  } else {
    const audioOnly = await tryGetUserMedia({ audio: true });
    if (audioOnly) {
      handles.stream = audioOnly;
      hasMic = true;
      error = "Camera blocked — allow camera in browser settings, then tap Retry";
    } else {
      error =
        "Camera unavailable — tap Allow camera below, or enable it in Settings → Safari → Camera";
    }
  }

  if (handles.stream?.getAudioTracks().length) {
    try {
      handles.audioContext = new AudioContext({ sampleRate: 16000 });
    } catch {
      handles.audioContext = new AudioContext();
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

  const hasCamera = stream.getVideoTracks().length > 0;
  const hasMic = stream.getAudioTracks().length > 0;
  let error: string | null = null;

  try {
    await attachStreamToVideo(videoEl, stream);
  } catch {
    error = "Camera on — tap the screen if preview is black";
  }

  if (hasCamera && !hasMic) {
    error = "Microphone blocked — punch counting may be limited";
  }

  if (stream.getAudioTracks().length) {
    try {
      handles.audioContext = new AudioContext({ sampleRate: 16000 });
    } catch {
      handles.audioContext = new AudioContext();
    }
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
