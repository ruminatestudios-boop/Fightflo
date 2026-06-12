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

export async function startMediaCapture(
  videoEl: HTMLVideoElement,
  options: MediaCaptureOptions = {}
): Promise<MediaCaptureResult> {
  const facingMode = options.facingMode ?? "environment";
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

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: highQuality
        ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    handles.stream = stream;
    hasCamera = stream.getVideoTracks().length > 0;
    hasMic = stream.getAudioTracks().length > 0;
    videoEl.srcObject = stream;
    videoEl.muted = true;
    await videoEl.play();
  } catch (e) {
    error = e instanceof Error ? e.message : "Camera and microphone unavailable";
    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
      handles.stream = audioOnly;
      hasMic = true;
      error = "Camera unavailable — audio-only mode";
    } catch {
      try {
        const videoOnly = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        handles.stream = videoOnly;
        hasCamera = true;
        videoEl.srcObject = videoOnly;
        videoEl.muted = true;
        await videoEl.play();
        error = "Microphone unavailable — tap mode when you punch";
      } catch {
        error = "Camera and microphone unavailable — using timer fallback";
      }
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
  /** Min peak between impacts (ms). Match fast combos — default 130. */
  cooldownMs?: number;
  /** Seconds to learn room noise before detecting. */
  calibrateMs?: number;
  /** Pre-flight calibrated threshold (overrides auto noise floor). */
  threshold?: number;
  /** Called with peak amplitude on each detected impact (for calibration UI). */
  onPeak?: (peak: number) => void;
}

/** Local mic impact detector — primary path for bag drill MVP. */
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
