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
import { saveCalibration } from "@/lib/bag-drill/detection/calibration-store";
import { MicPunchDetector } from "@/lib/bag-drill/detection/mic-punch-detector";
import {
  createPoseLandmarker,
  detectPose,
} from "@/lib/bag-drill/detection/pose-landmarker";
import { bodyVisible, detectStance } from "@/lib/bag-drill/detection/landmarks";
import { GuardMonitor } from "@/lib/bag-drill/detection/guard-monitor";
import { startMediaCapture } from "@/lib/bag-drill/media-capture";
import type { BagCameraMode } from "@/lib/bag-drill/types";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

type CalStep = "camera" | "stance" | "guard" | "mic" | "done";

const STEP_MS = 3000;

interface BagCalibrationScreenProps {
  cameraMode: BagCameraMode;
  stance: BagStance;
  onStanceChange: (stance: BagStance) => void;
  onBack: () => void;
  onComplete: (calibration: BagCalibration) => void;
}

export function BagCalibrationScreen({
  cameraMode,
  stance,
  onStanceChange,
  onBack,
  onComplete,
}: BagCalibrationScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const micRef = useRef<MicPunchDetector | null>(null);
  const peaksRef = useRef<number[]>([]);
  const guardMonitorRef = useRef(new GuardMonitor());
  const guardBaselineRef = useRef<ReturnType<GuardMonitor["calibrateFromLandmarks"]> | null>(
    null
  );
  const stepStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [step, setStep] = useState<CalStep>("camera");
  const [progress, setProgress] = useState(0);
  const [detectedStance, setDetectedStance] = useState<BagStance | null>(null);
  const [guardOk, setGuardOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [lightOk, setLightOk] = useState(false);
  const [bodyOk, setBodyOk] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [gpuOk, setGpuOk] = useState(true);

  const fighterCam = cameraMode === "fighter";
  const mirrored = fighterCam;

  const finish = useCallback(() => {
    const baseline = guardBaselineRef.current ?? {
      left: 0,
      right: 0,
      chinY: 0,
    };

    const cal: BagCalibration = {
      stance: detectedStance ?? stance,
      micThreshold: micThresholdFromPeaks(peaksRef.current),
      lightingOk: lightOk,
      brightness,
      testPunchesDetected: peaksRef.current.length,
      frameConfirmed: bodyOk,
      poseReady: bodyOk,
      guardBaseline: baseline,
      gpuDelegate: gpuOk,
    };
    saveCalibration(cal);
    onComplete(cal);
  }, [stance, detectedStance, lightOk, brightness, bodyOk, gpuOk, onComplete]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let mounted = true;

    void (async () => {
      const result = await startMediaCapture(video, {
        facingMode: fighterCam ? "user" : "environment",
        highQuality: false,
      });
      if (!mounted) return;
      stopRef.current = result.handles.stop;
      setPreviewError(result.error);

      try {
        const { landmarker, gpu } = await createPoseLandmarker();
        landmarkerRef.current = landmarker;
        setGpuOk(gpu);
      } catch {
        setPreviewError("Pose model failed to load");
      }

      if (result.handles.stream) {
        micRef.current = new MicPunchDetector({
          onSpike: (peak) => {
            peaksRef.current.push(peak);
            if (step === "mic") setMicOk(true);
          },
        });
      }
    })();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      micRef.current?.stop();
      landmarkerRef.current?.close();
      stopRef.current?.();
    };
  }, [fighterCam, step]);

  useEffect(() => {
    stepStartRef.current = Date.now();
    setProgress(0);

    if (step === "mic" && micRef.current) {
      peaksRef.current = [];
      const stream = videoRef.current?.srcObject as MediaStream | null;
      if (stream) micRef.current.start(stream);
    } else {
      micRef.current?.stop();
    }
  }, [step]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !landmarkerRef.current) return;

    const tick = () => {
      const lm = landmarkerRef.current;
      const v = videoRef.current;
      if (!lm || !v?.videoWidth) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const result = detectPose(lm, v, now);
      const landmarks = result?.landmarks?.[0];
      const elapsed = Date.now() - stepStartRef.current;
      setProgress(Math.min(1, elapsed / STEP_MS));

      if (landmarks) {
        if (step === "camera") {
          const visible = bodyVisible(landmarks);
          setBodyOk(visible);
          void sampleFrameBrightness(v).then((score) => {
            setBrightness(score);
            setLightOk(brightnessOk(score));
          });
          if (visible && lightOk && elapsed >= STEP_MS) {
            setStep("stance");
          }
        }

        if (step === "stance") {
          const s = detectStance(landmarks);
          setDetectedStance(s);
          onStanceChange(s);
          if (elapsed >= STEP_MS) setStep("guard");
        }

        if (step === "guard") {
          guardBaselineRef.current = guardMonitorRef.current.calibrateFromLandmarks(
            landmarks,
            v.videoHeight
          );
          if (elapsed >= STEP_MS) {
            setGuardOk(true);
            setStep("mic");
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [step, lightOk, onStanceChange]);

  useEffect(() => {
    if (step === "mic" && micOk) {
      const t = window.setTimeout(() => setStep("done"), 600);
      return () => clearTimeout(t);
    }
  }, [micOk, step]);

  const stepTitle: Record<CalStep, string> = {
    camera: "Stand back — full body",
    stance: "Hold your fighting stance",
    guard: "Hold your guard up",
    mic: "Throw one punch at the bag",
    done: "Ready to train",
  };

  const stepHint: Record<CalStep, string> = {
    camera: bodyOk
      ? lightOk
        ? "Full body visible ✅"
        : "Improve lighting"
      : "Step back a little / improve lighting",
    stance: detectedStance
      ? `${stanceLabel(detectedStance)} stance detected ✅`
      : "Detecting stance…",
    guard: guardOk ? "Guard calibrated ✅" : "Keep hands by your chin…",
    mic: micOk ? "Mic calibrated ✅" : "Hit the bag once",
    done: `All systems go · ${stanceLabel(detectedStance ?? stance)}`,
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

        <div className="mt-3 flex gap-2">
          {(["camera", "stance", "guard", "mic"] as const).map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full ${
                step === s || (step === "done" && i < 4)
                  ? "bg-[#fa4141]"
                  : ["camera", "stance", "guard", "mic"].indexOf(step) > i
                    ? "bg-emerald-500"
                    : "bg-white/15"
              }`}
            />
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
              <p className="label text-white/45">Calibration · step{" "}
                {step === "done" ? 4 : ["camera", "stance", "guard", "mic"].indexOf(step) + 1}
                /4
              </p>
              <h1 className="font-display mt-1 text-2xl tracking-wide text-white">
                {stepTitle[step]}
              </h1>
              <p className="mt-3 text-sm text-white/70">{stepHint[step]}</p>

              {step !== "done" && (
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[#fa4141] transition-all duration-100"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              )}

              {!gpuOk && (
                <p className="mt-2 text-xs text-amber-400/90">
                  For best accuracy use Chrome on a modern phone
                </p>
              )}

              {previewError && (
                <p className="mt-2 text-xs text-[#fa4141]/90">{previewError}</p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8">
            {step === "done" && (
              <button
                type="button"
                onClick={finish}
                className="font-display flex h-14 w-full items-center justify-center rounded-full bg-[#fa4141] text-[15px] tracking-[0.18em] text-white"
              >
                Start session setup
              </button>
            )}
            {step !== "done" && (
              <p className="text-center text-xs text-white/40">
                Auto-calibrating… hold still
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
