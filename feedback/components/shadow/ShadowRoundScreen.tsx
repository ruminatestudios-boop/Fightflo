"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OverlayCanvas } from "@/components/video/OverlayCanvas";
import { ShadowGuardFlash } from "@/components/shadow/ShadowGuardFlash";
import { ShadowRoundSummary } from "@/components/shadow/ShadowRoundSummary";
import { useShadowRoundTracking } from "@/hooks/useShadowRoundTracking";
import { useLiveCameraPose } from "@/hooks/useLiveCameraPose";
import { PersonLockOverlay } from "@/components/live/PersonLockOverlay";
import type { ShadowMoment } from "@/lib/shadow/shadowboxingCopy";
import { playCoachingSound, soundCategoryForEventType } from "@/lib/shadow/liveCoachingSounds";
import { SoundLegendModal } from "@/components/shadow/SoundLegendModal";
import {
  attachStreamToVideo,
  detachVideoStream,
  extensionForMime,
  formatCameraError,
  pickRecorderMimeType,
  startCameraStream,
  stopMediaStream,
  type CameraFacing,
} from "@/lib/camera/liveCapture";
import { saveShadowRound } from "@/lib/shadow/shadowStorage";
import { SHADOW_CALIBRATE_SECONDS } from "@/lib/shadow/types";
import type { ShadowRoundLength, ShadowRoundResult } from "@/lib/shadow/types";

type ScreenPhase = "camera" | "calibrate" | "round" | "summary";

interface ShadowRoundScreenProps {
  roundSeconds: ShadowRoundLength;
  onClose: () => void;
  onAnalyseRecording: (file: File) => void;
  onDone: (result: ShadowRoundResult) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ShadowRoundScreen({
  roundSeconds,
  onClose,
  onAnalyseRecording,
  onDone,
}: ShadowRoundScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const cameraSessionRef = useRef(0);
  const recordStartRef = useRef(0);
  const recordingFileRef = useRef<File | null>(null);

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("camera");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [calibrateLeft, setCalibrateLeft] = useState(SHADOW_CALIBRATE_SECONDS);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [result, setResult] = useState<ShadowRoundResult | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [showSoundLegend, setShowSoundLegend] = useState(false);

  const trackingPhase =
    screenPhase === "calibrate"
      ? "calibrating"
      : screenPhase === "round"
        ? "active"
        : screenPhase === "summary"
          ? "done"
          : "idle";

  const { landmarks: liveLandmarks, candidates, lockOnto } = useLiveCameraPose(
    videoRef,
    ready && screenPhase !== "summary"
  );

  const {
    calibration,
    stats,
    calibrateFrames,
    activeWarning,
    finishCalibration,
    resetTracking,
    buildResult,
    guardUptimePercent,
    issueCount,
    positiveCount,
  } = useShadowRoundTracking({
    landmarks: liveLandmarks,
    phase: trackingPhase,
    elapsedSec,
    roundSeconds,
  });

  // Text-on-screen during a live round fights the activity itself — eyes are
  // on your hands/coach, not the phone, so by the time text could be read the
  // moment's already passed. Live feedback is now sound + a screen flash only
  // (instant, no reading required); the readable explanation moves to the
  // post-round summary where there's actually time to read it. Triggered off
  // stats.moments — the same properly-debounced event log driving the HUD
  // issue/positive counters — not the raw per-frame metrics.
  const [flashMoment, setFlashMoment] = useState<ShadowMoment | null>(null);
  const lastMomentCountRef = useRef(0);
  const lastSoundAtRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Each category has its own ~1s debounce upstream, but different
  // categories firing back-to-back still stacked sounds too fast to tell
  // apart. This is a second, global gate: no new sound/flash fires until
  // enough real time has passed since the last one, regardless of type —
  // the underlying moment is still logged for the post-round summary
  // either way, this only throttles the live alert cadence.
  const SOUND_MIN_GAP_MS = 2600;

  useEffect(() => {
    if (screenPhase !== "round") {
      lastMomentCountRef.current = 0;
      return;
    }
    const moments = stats.moments;
    if (moments.length <= lastMomentCountRef.current) return;

    const newest = moments[moments.length - 1];
    lastMomentCountRef.current = moments.length;

    const now = Date.now();
    if (now - lastSoundAtRef.current < SOUND_MIN_GAP_MS) return;
    lastSoundAtRef.current = now;

    playCoachingSound(soundCategoryForEventType(newest.eventType));
    setFlashMoment(newest);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashMoment(null), 450);
  }, [stats.moments, screenPhase]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const remainingSec = Math.max(0, roundSeconds - elapsedSec);

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
      const message = formatCameraError(err);
      if (!message.includes("interrupted") && err instanceof Error && err.name !== "AbortError") {
        setError(message);
      }
    }
  }, [facing]);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    const updateViewport = () =>
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recorderRef.current) return;

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
        const file = new File(
          [blob],
          `shadow-round-${Date.now()}.${extensionForMime(type)}`,
          { type }
        );
        recordingFileRef.current = file;
        setRecordingFile(file);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
    } catch {
      /* recording optional */
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    if (!ready || screenPhase !== "camera") return;
    resetTracking();
    setScreenPhase("calibrate");
    setCalibrateLeft(SHADOW_CALIBRATE_SECONDS);
  }, [ready, screenPhase, resetTracking]);

  useEffect(() => {
    if (screenPhase !== "calibrate") return;

    const timer = window.setInterval(() => {
      setCalibrateLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          finishCalibration();
          startRecording();
          setScreenPhase("round");
          setElapsedSec(0);
          recordStartRef.current = performance.now();

          const tick = () => {
            const elapsed = (performance.now() - recordStartRef.current) / 1000;
            setElapsedSec(elapsed);
            if (elapsed >= roundSeconds) {
              cancelAnimationFrame(rafRef.current);
              stopRecording();
              const built = buildResult();
              saveShadowRound(built);
              setResult(built);
              setScreenPhase("summary");
              return;
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screenPhase, finishCalibration, startRecording, roundSeconds, stopRecording, buildResult]);

  const endRound = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    stopRecording();
    const built = buildResult();
    saveShadowRound(built);
    setResult(built);
    setScreenPhase("summary");
  }, [stopRecording, buildResult]);

  const handleClose = () => {
    stopRecording();
    stopCamera();
    onClose();
  };

  const handleDone = () => {
    if (result) onDone(result);
    stopCamera();
    onClose();
  };

  const handleAnalyse = () => {
    stopRecording();
    stopCamera();
    const file = recordingFile ?? recordingFileRef.current;
    if (file) {
      onAnalyseRecording(file);
    } else if (result) {
      onDone(result);
      onClose();
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  if (screenPhase === "summary" && result) {
    const summary = (
      <div className="shadow-round-root shadow-round-root--summary" role="dialog" aria-modal="true">
        <ShadowRoundSummary
          result={result}
          hasRecording={Boolean(recordingFile)}
          onAnalyse={recordingFile ? handleAnalyse : undefined}
          onDone={handleDone}
        />
      </div>
    );

    return portalTarget ? createPortal(summary, portalTarget) : null;
  }

  const liveView = (
    <div className="shadow-round-root" role="dialog" aria-modal="true" aria-label="Shadowboxing round">
      <video
        ref={videoRef}
        className={`shadow-round-video ${facing === "user" ? "shadow-round-video--mirror" : ""}`}
        autoPlay
        muted
        playsInline
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setVideoSize({ width: v.videoWidth, height: v.videoHeight });
        }}
      />

      {candidates.length > 1 && videoSize.width > 0 && (
        <PersonLockOverlay
          candidates={candidates}
          videoWidth={videoSize.width}
          videoHeight={videoSize.height}
          containerWidth={viewportSize.width}
          containerHeight={viewportSize.height}
          mirror={facing === "user"}
          onSelect={(candidate) => lockOnto(candidate.pose)}
        />
      )}

      {ready && screenPhase !== "camera" && (
        <OverlayCanvas
          videoRef={videoRef}
          landmarks={[]}
          annotations={[]}
          useLivePose
          externalLivePose
          externalLiveLandmarks={liveLandmarks}
          shadowFocusMode
          suppressAnnotationLabel
          guardCalibration={calibration}
          videoFit="cover"
          mirrorLandmarks={facing === "user"}
          highlightJoint={flashMoment?.joint ?? null}
          highlightKind={flashMoment?.kind ?? "issue"}
        />
      )}

      <ShadowGuardFlash warning={activeWarning} />

      <div className="shadow-round-top">
        <button
          type="button"
          className="live-record-icon-btn"
          onClick={handleClose}
          aria-label="Close shadowboxing round"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {screenPhase === "round" && (
          <span className="shadow-round-timer" aria-live="polite">
            <span className="live-record-rec-dot" aria-hidden />
            {formatDuration(remainingSec)} left
          </span>
        )}

        {screenPhase === "calibrate" && (
          <span className="shadow-round-timer" aria-live="polite">
            {`Calibrating ${calibrateLeft}s`}
          </span>
        )}

        <button
          type="button"
          className="live-record-icon-btn"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          aria-label="Flip camera"
          disabled={screenPhase === "round"}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {screenPhase === "calibrate" && (
        <div className="shadow-round-calibrate-banner">
          <p className="shadow-round-calibrate-title">Hands up — guard position</p>
          <p className="shadow-round-calibrate-sub">
            Stand side-on, full body in frame. We learn your guard height — recording
            starts automatically when the countdown ends.
            {calibrateFrames > 0 ? ` (${calibrateFrames} frames)` : ""}
          </p>
          <button
            type="button"
            className="shadow-round-sound-legend-btn"
            onClick={() => setShowSoundLegend(true)}
          >
            🔊 What do the sounds mean?
          </button>
        </div>
      )}

      <SoundLegendModal open={showSoundLegend} onClose={() => setShowSoundLegend(false)} />

      {flashMoment && screenPhase === "round" && (
        <div
          className={`shadow-coaching-flash shadow-coaching-flash--${
            flashMoment.kind === "positive" ? "positive" : soundCategoryForEventType(flashMoment.eventType)
          }`}
          aria-hidden
        />
      )}

      {screenPhase === "round" && (
        <div className="shadow-round-hud">
          <span className="shadow-round-hud-stat shadow-round-hud-stat--issue">
            <strong>{issueCount}</strong> issues
          </span>
          <span className="shadow-round-hud-stat shadow-round-hud-stat--positive">
            <strong>{positiveCount}</strong> good
          </span>
          <span className="shadow-round-hud-stat">
            <strong>{guardUptimePercent}%</strong> hands
          </span>
        </div>
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

      {screenPhase === "round" && (
        <div className="shadow-round-bottom">
          <p className="live-record-hint">
            Shadowboxing round — return hands to guard after every combo
          </p>
          <button
            type="button"
            className="live-record-btn live-record-btn--stop"
            onClick={endRound}
            aria-label="End round early"
          >
            <span className="live-record-btn-inner" />
          </button>
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(liveView, portalTarget) : null;
}
