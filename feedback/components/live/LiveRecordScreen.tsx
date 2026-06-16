"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OverlayCanvas } from "@/components/video/OverlayCanvas";
import { computeFrameMetrics } from "@/lib/analysis/poseMetrics";
import {
  attachStreamToVideo,
  detachVideoStream,
  extensionForMime,
  MAX_LIVE_RECORD_SECONDS,
  pickRecorderMimeType,
  startCameraStream,
  stopMediaStream,
  type CameraFacing,
} from "@/lib/camera/liveCapture";
import { liveGuardDropLabel } from "@/lib/guard/guardAnalysis";
import { useLiveCameraPose } from "@/hooks/useLiveCameraPose";

interface LiveRecordScreenProps {
  onClose: () => void;
  onRecordingComplete: (file: File) => void;
}

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LiveRecordScreen({
  onClose,
  onRecordingComplete,
}: LiveRecordScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const rafRef = useRef<number>(0);
  const cameraSessionRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [facing, setFacing] = useState<CameraFacing>("environment");

  const liveLandmarks = useLiveCameraPose(videoRef, ready);

  const liveNote = liveLandmarks
    ? liveGuardDropLabel(computeFrameMetrics(liveLandmarks))
    : null;

  const remainingSec = Math.max(0, MAX_LIVE_RECORD_SECONDS - elapsedSec);
  const remainingFraction = remainingSec / MAX_LIVE_RECORD_SECONDS;
  const ringOffset = RING_CIRCUMFERENCE * (1 - remainingFraction);

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    cancelAnimationFrame(rafRef.current);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    detachVideoStream(videoRef.current);
    setReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    const session = ++cameraSessionRef.current;
    setError(null);
    setReady(false);

    const video = videoRef.current;
    if (!video) return;

    stopMediaStream(streamRef.current);
    streamRef.current = null;
    video.pause();
    video.srcObject = null;

    try {
      const stream = await startCameraStream(facing);
      if (session !== cameraSessionRef.current) {
        stopMediaStream(stream);
        return;
      }

      streamRef.current = stream;
      await attachStreamToVideo(video, stream, () => session !== cameraSessionRef.current);

      if (session !== cameraSessionRef.current) return;

      setReady(true);
      setError(null);
    } catch (err) {
      if (session !== cameraSessionRef.current) return;

      const message =
        err instanceof Error ? err.message : "Could not access camera";
      if (message.includes("NotAllowed") || message.includes("Permission")) {
        setError("Camera permission denied — allow camera in browser settings.");
      } else if (
        message.includes("interrupted") ||
        message.includes("AbortError")
      ) {
        return;
      } else {
        setError(message);
      }
    }
  }, [facing]);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const flipCamera = useCallback(() => {
    if (recording) return;
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }, [recording]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
    setRecording(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recording) return;

    const mimeType = pickRecorderMimeType();
    chunksRef.current = [];

    try {
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = extensionForMime(type);
        const file = new File([blob], `live-coach-${Date.now()}.${ext}`, {
          type,
        });
        onRecordingComplete(file);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setRecording(true);
      setElapsedSec(0);
      recordStartRef.current = performance.now();

      const tick = () => {
        const elapsed = (performance.now() - recordStartRef.current) / 1000;
        setElapsedSec(elapsed);

        if (elapsed >= MAX_LIVE_RECORD_SECONDS) {
          stopRecording();
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Recording not supported on this device.");
    }
  }, [recording, onRecordingComplete, stopRecording]);

  return (
    <div className="live-record-root" role="dialog" aria-modal="true" aria-label="Live coach">
      <video
        ref={videoRef}
        className={`live-record-video ${facing === "user" ? "live-record-video--mirror" : ""}`}
        autoPlay
        muted
        playsInline
      />

      {ready && (
        <OverlayCanvas
          videoRef={videoRef}
          landmarks={[]}
          annotations={[]}
          useLivePose
          externalLivePose
          externalLiveLandmarks={liveLandmarks}
          guardFocusMode
          suppressAnnotationLabel
        />
      )}

      <div className="live-record-top">
        <button
          type="button"
          className="live-record-icon-btn"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          aria-label="Close live coach"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {recording && (
          <span className="live-record-timer" aria-live="polite">
            <span className="live-record-rec-dot" aria-hidden />
            {formatDuration(remainingSec)} left
          </span>
        )}
        <button
          type="button"
          className="live-record-icon-btn"
          onClick={flipCamera}
          aria-label="Flip camera"
          disabled={recording}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {liveNote && (
        <p className="stepguide-cinema-pill stepguide-cinema-pill--red live-record-note">
          {liveNote.title}
        </p>
      )}

      {!ready && !error && (
        <p className="live-record-status">Starting camera…</p>
      )}

      {error && !ready && (
        <div className="live-record-error">
          <p>{error}</p>
          <button type="button" className="live-record-retry" onClick={() => void startCamera()}>
            Try again
          </button>
        </div>
      )}

      <div className="live-record-bottom">
        <p className="live-record-hint">
          {recording
            ? `${formatDuration(remainingSec)} remaining — skeleton tracks live`
            : `Up to ${formatDuration(MAX_LIVE_RECORD_SECONDS)} — live skeleton + guard cues`}
        </p>
        <button
          type="button"
          className={`live-record-btn ${recording ? "live-record-btn--stop" : ""}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={!ready || Boolean(error)}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording && (
            <svg
              className="live-record-ring"
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle
                className="live-record-ring-track"
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
              />
              <circle
                className="live-record-ring-progress"
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 50 50)"
              />
            </svg>
          )}
          <span className="live-record-btn-inner" />
        </button>
      </div>
    </div>
  );
}
