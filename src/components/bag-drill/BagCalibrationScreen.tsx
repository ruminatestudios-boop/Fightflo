"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "@/components/ui/BackButton";
import { FighterFrameOverlay } from "@/components/bag-drill/FighterFrameOverlay";
import { chipClass } from "@/components/bag-drill/bag-ui";
import {
  brightnessOk,
  micThresholdFromPeaks,
  sampleFrameBrightness,
  stanceLabel,
  type BagCalibration,
  type BagStance,
} from "@/lib/bag-drill/calibration";
import {
  createAudioImpactDetector,
  startMediaCapture,
} from "@/lib/bag-drill/media-capture";
import type { BagCameraMode } from "@/lib/bag-drill/types";

type CalStep = "frame" | "light" | "punches" | "done";

interface BagCalibrationScreenProps {
  cameraMode: BagCameraMode;
  stance: BagStance;
  onStanceChange: (stance: BagStance) => void;
  onBack: () => void;
  onComplete: (calibration: BagCalibration) => void;
}

const TEST_PUNCHES_NEEDED = 3;

export function BagCalibrationScreen({
  cameraMode,
  stance,
  onStanceChange,
  onBack,
  onComplete,
}: BagCalibrationScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const cleanupAudioRef = useRef<(() => void) | null>(null);
  const peaksRef = useRef<number[]>([]);
  const punchesRef = useRef(0);

  const [step, setStep] = useState<CalStep>("frame");
  const [frameOk, setFrameOk] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [lightOk, setLightOk] = useState(false);
  const [punches, setPunches] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fighterCam = cameraMode === "fighter";
  const mirrored = fighterCam;

  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    stopRef.current?.();
    cleanupAudioRef.current?.();

    void startMediaCapture(video, {
      facingMode: fighterCam ? "user" : "environment",
      highQuality: fighterCam,
    }).then((result) => {
      stopRef.current = result.handles.stop;
      setPreviewError(result.error);

      if (result.handles.stream && result.handles.audioContext) {
        peaksRef.current = [];
        punchesRef.current = 0;
        cleanupAudioRef.current = createAudioImpactDetector(
          result.handles.stream,
          result.handles.audioContext,
          () => {
            if (stepRef.current !== "punches") return;
            punchesRef.current += 1;
            setPunches(punchesRef.current);
          },
          {
            calibrateMs: 800,
            cooldownMs: 280,
            onPeak: (peak) => {
              if (stepRef.current === "punches") peaksRef.current.push(peak);
            },
          }
        );
      }
    });

    return () => {
      cleanupAudioRef.current?.();
      stopRef.current?.();
    };
  }, [fighterCam]);

  useEffect(() => {
    if (step !== "light") return;
    const id = window.setInterval(() => {
      void sampleFrameBrightness(videoRef.current!).then((score) => {
        setBrightness(score);
        setLightOk(brightnessOk(score));
      });
    }, 400);
    return () => clearInterval(id);
  }, [step]);

  const finish = useCallback(() => {
    const cal: BagCalibration = {
      stance,
      micThreshold: micThresholdFromPeaks(peaksRef.current),
      lightingOk: lightOk,
      brightness,
      testPunchesDetected: punchesRef.current,
      frameConfirmed: frameOk,
    };
    onComplete(cal);
  }, [stance, lightOk, brightness, frameOk, onComplete]);

  useEffect(() => {
    if (step === "punches" && punches >= TEST_PUNCHES_NEEDED) {
      const t = window.setTimeout(() => setStep("done"), 400);
      return () => clearTimeout(t);
    }
  }, [punches, step]);

  const stepTitle: Record<CalStep, string> = {
    frame: fighterCam ? "Get in frame" : "Point at the bag",
    light: "Check lighting",
    punches: "Test punches",
    done: "Ready to train",
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover ${
          mirrored ? "scale-x-[-1]" : ""
        }`}
      />

      {fighterCam && <FighterFrameOverlay mirrored={mirrored} />}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/85" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <BackButton
          onClick={onBack}
          className="border-white/20 bg-black/40 text-white backdrop-blur-sm"
        />

        <div className="mt-4 flex gap-2">
          {(["orthodox", "southpaw"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStanceChange(s)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur-sm ${chipClass(stance === s)}`}
            >
              {stanceLabel(s)}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-end">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className="label text-white/45">Calibration</p>
              <h1 className="font-display mt-1 text-2xl tracking-wide text-white">
                {stepTitle[step]}
              </h1>

              {step === "frame" && (
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
                  {fighterCam
                    ? "Centre your shoulders and hands in the guide. AI needs your full upper body."
                    : "Frame the heavy bag. Mic will hear impacts from this angle."}
                </p>
              )}

              {step === "light" && (
                <p className="mt-3 text-sm text-white/65">
                  {lightOk
                    ? "Lighting looks good."
                    : brightness < 0.1
                      ? "Too dark — add light or move closer to a window."
                      : "Too bright — reduce backlight glare on the camera."}
                  <span className="mt-1 block text-xs text-white/40">
                    Level: {Math.round(brightness * 100)}%
                  </span>
                </p>
              )}

              {step === "punches" && (
                <p className="mt-3 text-sm text-white/65">
                  Throw {TEST_PUNCHES_NEEDED} test punches on the bag so we learn
                  your impact sound.
                  <span className="mt-2 block font-display text-lg text-white">
                    {punches} / {TEST_PUNCHES_NEEDED}
                  </span>
                </p>
              )}

              {step === "done" && (
                <p className="mt-3 text-sm text-emerald-400/90">
                  Mic calibrated · {stanceLabel(stance)} stance ·{" "}
                  {fighterCam ? "Fighter AI ready" : "Impact detection ready"}
                </p>
              )}

              {previewError && (
                <p className="mt-2 text-xs text-[#fa4141]/90">{previewError}</p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8">
            {step === "frame" && (
              <button
                type="button"
                onClick={() => {
                  setFrameOk(true);
                  setStep("light");
                }}
                className="font-display flex h-14 w-full items-center justify-center rounded-full bg-white text-[15px] tracking-[0.18em] text-black"
              >
                I&apos;m in frame
              </button>
            )}
            {step === "light" && (
              <button
                type="button"
                disabled={!lightOk}
                onClick={() => setStep("punches")}
                className="font-display flex h-14 w-full items-center justify-center rounded-full bg-white text-[15px] tracking-[0.18em] text-black disabled:opacity-40"
              >
                {lightOk ? "Continue" : "Fix lighting first"}
              </button>
            )}
            {step === "punches" && (
              <p className="text-center text-xs text-white/40">
                Punch the bag — mic is listening
              </p>
            )}
            {step === "done" && (
              <button
                type="button"
                onClick={finish}
                className="font-display flex h-14 w-full items-center justify-center rounded-full bg-[#fa4141] text-[15px] tracking-[0.18em] text-white"
              >
                Start session setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
