"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BackButton } from "@/components/ui/BackButton";
import { chipClass, CAMERA_MODE_COPY } from "@/components/bag-drill/bag-ui";
import type { BagStance } from "@/lib/bag-drill/calibration";
import {
  appendMicrophoneToCapture,
  detachVideoPreview,
  releaseVideoPreview,
  startMediaCapture,
  type MediaCaptureHandles,
} from "@/lib/bag-drill/media-capture";
import type { BagCameraMode } from "@/lib/bag-drill/types";

interface BagSetupCameraScreenProps {
  initialMode?: BagCameraMode;
  isPro?: boolean;
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
  onBack,
  onContinue,
}: BagSetupCameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handlesRef = useRef<MediaCaptureHandles | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<BagCameraMode>(initialMode);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fighterCam = cameraMode === "fighter";

  const releaseCamera = useCallback(() => {
    handlesRef.current?.stop();
    handlesRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    releaseVideoPreview(videoRef.current);
    streamRef.current = null;
    setCameraReady(false);
    setMicReady(false);
  }, []);

  const startAccess = useCallback(async () => {
    const video = videoRef.current;
    if (!video || starting) return;

    releaseCamera();
    setStarting(true);
    setPreviewError(null);

    const result = await startMediaCapture(video, {
      facingMode: fighterCam ? "user" : "environment",
      highQuality: false,
      requestMicrophone: true,
    });

    handlesRef.current = result.handles;
    streamRef.current = result.handles.stream;
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
  }, [fighterCam, releaseCamera, starting]);

  const startMic = useCallback(async () => {
    const handles = handlesRef.current;
    if (!handles?.stream || starting) return;

    setStarting(true);
    setPreviewError(null);

    const mic = await appendMicrophoneToCapture(handles);
    setMicReady(mic.hasMic);
    setPreviewError(mic.hasMic ? null : mic.error);
    setStarting(false);
  }, [starting]);

  const switchMode = (mode: BagCameraMode) => {
    if (mode === cameraMode) return;
    releaseCamera();
    setCameraMode(mode);
    setPreviewError(null);
  };

  const handleContinue = () => {
    handlesRef.current = null;
    detachVideoPreview(videoRef.current);
    onContinue(cameraMode, "orthodox", streamRef.current);
    streamRef.current = null;
  };

  const handleBack = () => {
    releaseCamera();
    onBack();
  };

  const statusText = !cameraReady
    ? "Tap below — your phone will ask for permission"
    : micReady
      ? "Camera & mic ready"
      : "Camera ready — allow mic next";

  const primaryLabel = !cameraReady
    ? starting
      ? "Opening camera…"
      : "Allow camera & microphone"
    : !micReady
      ? starting
        ? "Opening mic…"
        : "Allow microphone"
      : "Continue";

  const primaryAction = () => {
    if (!cameraReady) return void startAccess();
    if (!micReady) return void startMic();
    handleContinue();
  };

  const showSkipMic = cameraReady && !micReady;
  const showRetry = Boolean(previewError);
  const primaryReady = cameraReady && micReady;

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover ${
          fighterCam ? "scale-x-[-1]" : ""
        } ${cameraReady ? "opacity-100" : "opacity-0"}`}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <BackButton
            onClick={handleBack}
            className="border-white/20 bg-black/40 text-white backdrop-blur-sm"
          />
          <div className="flex flex-col items-end gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
              Point camera at
            </p>
            <div className="flex gap-1 rounded-full border border-white/15 bg-black/40 p-0.5 backdrop-blur-sm">
              {(["fighter", "bag"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => switchMode(mode)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${chipClass(cameraMode === mode)}`}
                >
                  {CAMERA_MODE_COPY[mode].toggleLabel}
                </button>
              ))}
            </div>
            <p className="text-right text-[11px] text-white/55">
              {CAMERA_MODE_COPY[cameraMode].description}
            </p>
          </div>
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
