"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BackButton } from "@/components/ui/BackButton";
import { chipClass } from "@/components/bag-drill/bag-ui";
import type { BagStance } from "@/lib/bag-drill/calibration";
import { startMediaCapture } from "@/lib/bag-drill/media-capture";
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
  const stopRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<BagCameraMode>(initialMode);
  const [cameraReady, setCameraReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fighterCam = cameraMode === "fighter";

  const releaseCamera = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video || starting) return;

    releaseCamera();
    setStarting(true);
    setPreviewError(null);

    const result = await startMediaCapture(video, {
      facingMode: fighterCam ? "user" : "environment",
      highQuality: false,
    });

    stopRef.current = result.handles.stop;
    streamRef.current = result.handles.stream;
    setCameraReady(result.hasCamera);
    setPreviewError(
      result.hasCamera
        ? result.error
        : result.error ?? "Camera blocked — allow access when prompted"
    );
    setStarting(false);
  }, [fighterCam, releaseCamera, starting]);

  const switchMode = (mode: BagCameraMode) => {
    if (mode === cameraMode) return;
    releaseCamera();
    setCameraMode(mode);
    setPreviewError(null);
  };

  const handleContinue = () => {
    stopRef.current = null;
    onContinue(cameraMode, "orthodox", streamRef.current);
    streamRef.current = null;
  };

  const handleBack = () => {
    releaseCamera();
    onBack();
  };

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

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

      <div className="relative z-10 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <BackButton
            onClick={handleBack}
            className="border-white/20 bg-black/40 text-white backdrop-blur-sm"
          />
          <div className="flex gap-1 rounded-full border border-white/15 bg-black/40 p-0.5 backdrop-blur-sm">
            {(["fighter", "bag"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => switchMode(mode)}
                className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider ${chipClass(cameraMode === mode)}`}
              >
                {mode === "fighter" ? "Fighter" : "Bag"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/92 px-5 py-4 backdrop-blur-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="space-y-3">
          {previewError && (
            <p className="text-center text-xs leading-relaxed text-[#fa4141]/90">
              {previewError}
            </p>
          )}

          {!cameraReady ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => void startCamera()}
              disabled={starting}
              className="font-display flex h-14 w-full items-center justify-center rounded-full bg-[#fa4141] text-[15px] tracking-[0.14em] text-white disabled:opacity-60"
            >
              {starting ? "Opening camera…" : "Allow camera access"}
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              className="font-display flex h-14 w-full items-center justify-center rounded-full bg-white text-[15px] tracking-[0.2em] text-black"
            >
              Continue
            </motion.button>
          )}

          {!cameraReady && previewError && (
            <button
              type="button"
              onClick={() => void startCamera()}
              className="w-full text-center text-xs text-white/40 hover:text-white/60"
            >
              Tap to retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
