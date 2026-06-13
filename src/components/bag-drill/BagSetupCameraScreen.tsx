"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BackButton } from "@/components/ui/BackButton";
import { CAMERA_MODE_COPY } from "@/components/bag-drill/bag-ui";
import { CameraFlipButton } from "@/components/bag-drill/CameraFlipButton";
import type { BagStance } from "@/lib/bag-drill/calibration";
import {
  appendMicrophoneToCapture,
  detachVideoPreview,
  isIOSDevice,
  reacquireMediaWithMicrophone,
  releaseVideoPreview,
  retryVideoPlay,
  startMediaCapture,
  type MediaCaptureHandles,
} from "@/lib/bag-drill/media-capture";
import { unlockBagAudio } from "@/lib/bag-drill/audio-queue";
import { MicListenPanel } from "@/components/bag-drill/MicListenPanel";
import type { BagCameraMode } from "@/lib/bag-drill/types";
import type { CalibrationPurpose } from "@/lib/bag-drill/calibration-purpose";

interface BagSetupCameraScreenProps {
  initialMode?: BagCameraMode;
  isPro?: boolean;
  calibrationPurpose?: CalibrationPurpose;
  onBack: () => void;
  onContinue: (
    cameraMode: BagCameraMode,
    stance: BagStance,
    stream: MediaStream | null
  ) => void;
  onUpgrade?: () => void;
}

export function BagSetupCameraScreen({
  initialMode = "fighter",
  calibrationPurpose = "combo",
  onBack,
  onContinue,
}: BagSetupCameraScreenProps) {
  const bagOnly = calibrationPurpose === "flurry";
  const micRequired =
    calibrationPurpose === "speed" || calibrationPurpose === "flurry";
  const videoRef = useRef<HTMLVideoElement>(null);
  const handlesRef = useRef<MediaCaptureHandles | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<BagCameraMode>(initialMode);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);

  const fighterCam = cameraMode === "fighter";

  const releaseCamera = useCallback(() => {
    handlesRef.current?.stop();
    handlesRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    releaseVideoPreview(videoRef.current);
    streamRef.current = null;
    setDisplayStream(null);
    setCameraReady(false);
    setMicReady(false);
  }, []);

  const startAccess = useCallback(
    async (modeOverride?: BagCameraMode) => {
      const video = videoRef.current;
      if (!video || starting) return;

      const mode = modeOverride ?? cameraMode;
      const facingMode = mode === "fighter" ? "user" : "environment";

      releaseCamera();
      setStarting(true);
      setPreviewError(null);

      void unlockBagAudio();

      const result = await startMediaCapture(video, {
        facingMode,
        highQuality: false,
        requestMicrophone: true,
      });

      handlesRef.current = result.handles;
      streamRef.current = result.handles.stream;
      setDisplayStream(result.handles.stream);
      setCameraReady(result.hasCamera);
      setMicReady(result.hasMic);
      setPreviewError(
        result.hasCamera
          ? result.hasMic
            ? null
            : result.error ?? "Allow microphone when your phone prompts you"
          : result.error ?? "Allow camera when your phone prompts you"
      );
      setStarting(false);
    },
    [cameraMode, releaseCamera, starting]
  );

  const startMic = useCallback(async () => {
    const video = videoRef.current;
    if (!video || starting) return;

    setStarting(true);
    setPreviewError(null);
    void unlockBagAudio();

    if (isIOSDevice()) {
      const result = await reacquireMediaWithMicrophone(
        video,
        cameraMode === "fighter" ? "user" : "environment",
        streamRef.current
      );
      handlesRef.current = result.handles;
      streamRef.current = result.handles.stream;
      setDisplayStream(result.handles.stream);
      setCameraReady(result.hasCamera);
      setMicReady(result.hasMic);
      setPreviewError(
        result.hasMic
          ? null
          : result.error ??
              "Tap Allow for microphone — or aA → Website Settings → Microphone → Allow"
      );
      setStarting(false);
      return;
    }

    const handles = handlesRef.current;
    if (!handles?.stream) {
      setStarting(false);
      return;
    }

    const mic = await appendMicrophoneToCapture(handles);
    setMicReady(mic.hasMic);
    setPreviewError(mic.hasMic ? null : mic.error);
    setStarting(false);
  }, [cameraMode, starting]);

  const flipCamera = () => {
    const next: BagCameraMode = cameraMode === "fighter" ? "bag" : "fighter";
    const wasActive = cameraReady;
    setCameraMode(next);
    setPreviewError(null);
    if (wasActive) {
      void startAccess(next);
    } else {
      releaseCamera();
    }
  };

  const handleContinue = () => {
    void unlockBagAudio();
    handlesRef.current = null;
    detachVideoPreview(videoRef.current);
    onContinue(cameraMode, "orthodox", streamRef.current);
    streamRef.current = null;
  };

  const handlePreviewTap = () => {
    if (!cameraReady) return;
    void retryVideoPlay(videoRef.current).then((ok) => {
      if (ok) setPreviewError(null);
    });
  };

  const handleBack = () => {
    releaseCamera();
    onBack();
  };

  const primaryLabel = !cameraReady
    ? starting
      ? "Opening camera…"
      : "Allow camera & microphone"
    : !micReady
      ? starting
        ? "Opening mic…"
        : isIOSDevice()
          ? "Allow camera & microphone"
          : "Allow microphone"
      : "Continue";

  const statusText = !cameraReady
    ? "Tap below — Safari will ask for camera and microphone"
    : micReady
      ? "Camera & mic ready"
      : isIOSDevice()
        ? "Camera on — allow microphone next (aA → Website Settings if blocked)"
        : "Camera ready — allow mic next";

  const primaryAction = () => {
    if (!cameraReady) return void startAccess();
    if (!micReady) {
      if (micRequired) return void startMic();
      return void startMic();
    }
    handleContinue();
  };

  const showSkipMic = cameraReady && !micReady && !micRequired;
  const showRetry = Boolean(previewError);
  const primaryReady = cameraReady && micReady;

  const modeHint = CAMERA_MODE_COPY[cameraMode].flipHint;

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onClick={handlePreviewTap}
        className={`absolute inset-0 h-full w-full object-cover ${
          fighterCam ? "scale-x-[-1]" : ""
        } ${cameraReady ? "opacity-100" : "opacity-0"}`}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <BackButton
            onClick={handleBack}
            className="border-white/20 bg-black/40 text-white backdrop-blur-sm"
          />
          {bagOnly ? (
            <p className="pt-2 text-right text-[10px] font-semibold uppercase tracking-wide text-white/70">
              Mic on bag
            </p>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <CameraFlipButton
                onClick={flipCamera}
                disabled={starting}
                label={`Flip to ${cameraMode === "fighter" ? "bag" : "you"} camera`}
              />
              <p className="max-w-[11rem] text-right text-[11px] leading-snug text-white/55">
                {modeHint}
              </p>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1" aria-hidden />

        <div className="shrink-0 space-y-2 pt-4">
          <div className="flex h-10 items-center justify-center px-1">
            <p
              className={`text-center text-xs ${
                cameraReady && micReady
                  ? "text-emerald-400/90"
                  : previewError
                    ? "text-[#fa4141]/90"
                    : "text-white/50"
              }`}
            >
              {previewError ?? statusText}
            </p>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={primaryAction}
            disabled={starting}
            className={`font-display flex h-14 w-full items-center justify-center rounded-full text-[15px] tracking-[0.14em] disabled:opacity-60 ${
              primaryReady
                ? "bg-white text-black tracking-[0.2em]"
                : "bg-[#fa4141] text-white"
            }`}
          >
            {primaryLabel}
          </motion.button>

          {micRequired && cameraReady && (
            <MicListenPanel
              stream={displayStream}
              onEnableMic={() => void startMic()}
              enabling={starting}
            />
          )}

          {micRequired && cameraReady && !micReady && (
            <p className="text-center text-xs text-amber-200/80">
              {isIOSDevice()
                ? "On iPhone, tap the red button — Safari must allow both camera and microphone together"
                : "Microphone required for punch speed — allow mic to continue"}
            </p>
          )}

          <div className="flex h-10 items-center justify-center">
            {showSkipMic ? (
              <button
                type="button"
                onClick={handleContinue}
                className="text-xs text-white/45 hover:text-white/65"
              >
                Continue with camera only
              </button>
            ) : showRetry ? (
              <button
                type="button"
                onClick={() => void (cameraReady ? startMic() : startAccess())}
                className="text-xs text-white/40 hover:text-white/60"
              >
                Tap to retry
              </button>
            ) : (
              <span className="text-xs text-transparent select-none" aria-hidden>
                —
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
