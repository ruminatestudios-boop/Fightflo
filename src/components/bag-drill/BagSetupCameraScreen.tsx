"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BackButton } from "@/components/ui/BackButton";
import { FighterFrameOverlay } from "@/components/bag-drill/FighterFrameOverlay";
import { chipClass } from "@/components/bag-drill/bag-ui";
import { stanceLabel, type BagStance } from "@/lib/bag-drill/calibration";
import { startMediaCapture } from "@/lib/bag-drill/media-capture";
import type { BagCameraMode } from "@/lib/bag-drill/types";

interface BagSetupCameraScreenProps {
  initialMode?: BagCameraMode;
  isPro?: boolean;
  onBack: () => void;
  onContinue: (cameraMode: BagCameraMode, stance: BagStance) => void;
  onUpgrade?: () => void;
}

const CAMERA_MODES: {
  id: BagCameraMode;
  label: string;
  headline: string;
  bullets: string[];
}[] = [
  {
    id: "fighter",
    label: "Fighter",
    headline: "Pose + mic recognises your punches",
    bullets: [
      "Front camera tracks shoulders, elbows, and wrists",
      "Scores jab, cross, hook, and correct order",
      "Best for technique and combo accuracy",
    ],
  },
  {
    id: "bag",
    label: "Bag",
    headline: "Triple-signal bag detection",
    bullets: [
      "Rear camera + mic + motion fusion",
      "Counts impacts with high accuracy",
      "Use Fighter cam for jab/cross/hook scoring",
    ],
  },
];

export function BagSetupCameraScreen({
  initialMode = "bag",
  isPro: isProUser = false,
  onBack,
  onContinue,
  onUpgrade,
}: BagSetupCameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [cameraMode, setCameraMode] = useState<BagCameraMode>(initialMode);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [stance, setStance] = useState<BagStance>("orthodox");

  const active = CAMERA_MODES.find((m) => m.id === cameraMode)!;
  const fighterCam = cameraMode === "fighter";

  const handleModeSelect = (mode: BagCameraMode) => {
    setCameraMode(mode);
  };

  const handleContinue = () => {
    onContinue(cameraMode, stance);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    stopRef.current?.();
    void startMediaCapture(video, {
      facingMode: fighterCam ? "user" : "environment",
      highQuality: false,
    }).then((result) => {
      stopRef.current = result.handles.stop;
      setPreviewError(result.error);
    });

    return () => stopRef.current?.();
  }, [cameraMode, fighterCam]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover ${
          fighterCam ? "scale-x-[-1]" : ""
        }`}
      />

      {fighterCam && <FighterFrameOverlay mirrored />}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between">
          <BackButton
            onClick={onBack}
            className="border-white/20 bg-black/40 text-white backdrop-blur-sm"
          />
        </div>

        <div className="flex flex-1 flex-col justify-end">
          <motion.div
            key={cameraMode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="label text-white/50">Detection mode</p>
            <h1 className="font-display mt-1 text-3xl tracking-wide text-white">
              {active.headline}
            </h1>
            <ul className="mt-3 max-w-sm space-y-1.5 text-sm leading-relaxed text-white/65">
              {active.bullets.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-white/30">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {previewError && (
              <p className="mt-2 text-xs text-[#fa4141]/90">{previewError}</p>
            )}
          </motion.div>

          <div className="mt-6 flex gap-2">
            {(["orthodox", "southpaw"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStance(s)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur-sm ${chipClass(stance === s)}`}
              >
                {stanceLabel(s)}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <p className="label text-white/40">Choose mode</p>
            <div className="flex gap-2">
              {CAMERA_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeSelect(m.id)}
                  className={`flex-1 rounded-xl border px-3 py-3 text-left backdrop-blur-sm transition-colors ${chipClass(cameraMode === m.id)}`}
                >
                  <span className="font-display text-sm">{m.label}</span>
                  <span className="mt-0.5 block text-[10px] normal-case tracking-normal text-white/45">
                    {m.id === "fighter" ? "Punch recognition" : "Impact count"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="font-display mt-6 flex h-14 w-full items-center justify-center rounded-full bg-white text-[15px] tracking-[0.2em] text-black"
          >
            Continue
          </motion.button>
        </div>
      </div>
    </div>
  );
}
