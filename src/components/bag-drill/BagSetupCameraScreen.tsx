"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BackButton } from "@/components/ui/BackButton";
import { CAMERA_MODE_COPY } from "@/components/bag-drill/bag-ui";
import { CameraFlipButton } from "@/components/bag-drill/CameraFlipButton";
import type { BagStance } from "@/lib/bag-drill/calibration";
import {
  appendMicrophoneToCapture,
  detachVideoPreview,
  isIOSDevice,
  queryMicPermissionState,
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
  const [micPermission, setMicPermission] = useState<PermissionState | "unknown">(
    "unknown"
  );
  const [micAttempted, setMicAttempted] = useState(false);

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

  useEffect(() => {
    if (!cameraReady || micReady) return;
    void queryMicPermissionState().then(setMicPermission);
  }, [cameraReady, micReady, previewError, starting]);

  const refreshMicPermission = useCallback(async () => {
    const state = await queryMicPermissionState();
    setMicPermission(state);
    return state;
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
      if (result.hasMic) {
        setMicPermission("granted");
        setMicAttempted(false);
      } else if (result.hasCamera) {
        void refreshMicPermission();
      } else {
        void refreshMicPermission();
      }
      setPreviewError(
        result.hasCamera
          ? result.hasMic
            ? null
            : null
          : result.error ?? "Allow camera when your phone prompts you"
      );
      setStarting(false);
    },
    [cameraMode, refreshMicPermission, releaseCamera, starting]
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
      if (result.hasMic) {
        setMicPermission("granted");
        setMicAttempted(false);
      } else {
        setMicAttempted(true);
        void refreshMicPermission();
      }
      setPreviewError(null);
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
    if (mic.hasMic) {
      setMicPermission("granted");
      setMicAttempted(false);
    } else {
      setMicAttempted(true);
      void refreshMicPermission();
    }
    setPreviewError(null);
    setStarting(false);
  }, [cameraMode, refreshMicPermission, starting]);

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

  const micNeedsSafariSettings =
    micPermission === "denied" ||
    (cameraReady && !micReady && micAttempted && isIOSDevice());

  const primaryLabel = !cameraReady
    ? starting
      ? "Opening camera…"
      : "Allow camera & microphone"
    : micReady
      ? "Continue"
      : micNeedsSafariSettings
        ? "Continue without mic — tap each punch"
        : starting
          ? "Opening mic…"
          : "Enable microphone";

  const statusText = !cameraReady
    ? "Tap below — Safari will ask for camera and microphone"
    : micReady
      ? "Camera & mic ready — throw a test punch below"
      : micNeedsSafariSettings
        ? "Camera on — mic blocked in Safari Website Settings"
        : isIOSDevice()
          ? "Camera on — tap Enable microphone when Safari asks"
          : "Camera ready — allow mic next";

  const primaryAction = () => {
    if (!cameraReady) return void startAccess();
    if (micReady || (micRequired && micNeedsSafariSettings)) return handleContinue();
    return void startMic();
  };

  const showSkipMic = cameraReady && !micReady && !micRequired;
  const showMicRetry = cameraReady && !micReady && micNeedsSafariSettings;
  const showRetry = Boolean(previewError) && !cameraReady;
  const primaryReady = cameraReady && (micReady || (micRequired && micNeedsSafariSettings));

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

        <div className="max-h-[46vh] shrink-0 space-y-2 overflow-y-auto pt-4">
          <div className="flex min-h-10 items-center justify-center px-1">
            <p
              className={`text-center text-xs leading-relaxed ${
                cameraReady && micReady
                  ? "text-emerald-400/90"
                  : previewError
                    ? "text-[#fa4141]/90"
                    : micNeedsSafariSettings
                      ? "text-amber-200/85"
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

          {showMicRetry && (
            <button
              type="button"
              onClick={() => void startMic()}
              disabled={starting}
              className="font-display flex h-11 w-full items-center justify-center rounded-full border border-white/20 text-[11px] tracking-[0.12em] text-white/75 disabled:opacity-60"
            >
              I&apos;ve allowed mic — retry
            </button>
          )}

          {micRequired && cameraReady && !micReady && !micNeedsSafariSettings && (
            <button
              type="button"
              onClick={handleContinue}
              className="font-display flex h-11 w-full items-center justify-center rounded-full border border-white/20 text-[11px] tracking-[0.12em] text-white/75"
            >
              Continue without mic — tap each punch
            </button>
          )}

          {micRequired && cameraReady && micReady && (
            <MicListenPanel stream={displayStream} />
          )}

          {micRequired && cameraReady && !micReady && (
            <MicListenPanel
              stream={displayStream}
              micPermissionDenied={micNeedsSafariSettings}
            />
          )}

          <div className="flex min-h-10 items-center justify-center">
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
