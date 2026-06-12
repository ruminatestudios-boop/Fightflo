"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
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
import {
  attachExistingStream,
  startMediaCapture,
} from "@/lib/bag-drill/media-capture";
import type { BagCameraMode } from "@/lib/bag-drill/types";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

type CalStep = "camera" | "stance" | "guard" | "mic" | "done";

const STEP_MS = 3000;

interface BagCalibrationScreenProps {
  cameraMode: BagCameraMode;
  stance: BagStance;
  existingStream?: MediaStream | null;
  onStanceChange: (stance: BagStance) => void;
  onBack: () => void;
  onComplete: (calibration: BagCalibration) => void;
}

export function BagCalibrationScreen({
  cameraMode,
  stance,
  existingStream = null,
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
  const stepRef = useRef<CalStep>("camera");
  const rafRef = useRef<number | null>(null);

  const [step, setStep] = useState<CalStep>("camera");
  stepRef.current = step;
  const [detectedStance, setDetectedStance] = useState<BagStance | null>(null);
  const [guardOk, setGuardOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [lightOk, setLightOk] = useState(false);
  const [bodyOk, setBodyOk] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [gpuOk, setGpuOk] = useState(true);
  const [cameraReady, setCameraReady] = useState(Boolean(existingStream));
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);

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

  const bootCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video || startingRef.current) return;

    startingRef.current = true;
    setStarting(true);
    setPreviewError(null);

    const result = existingStream
      ? await attachExistingStream(video, existingStream)
      : await startMediaCapture(video, {
          facingMode: fighterCam ? "user" : "environment",
          highQuality: false,
        });

    stopRef.current = result.handles.stop;
    setCameraReady(result.hasCamera);
    setPreviewError(
      result.hasCamera
        ? result.error
        : result.error ?? "Camera blocked — tap Allow camera below"
    );

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
          if (stepRef.current === "mic") setMicOk(true);
        },
      });
    }

    startingRef.current = false;
    setStarting(false);
  }, [existingStream, fighterCam]);

  useEffect(() => {
    if (existingStream) {
      void bootCamera();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      micRef.current?.stop();
      landmarkerRef.current?.close();
      stopRef.current?.();
    };
  }, [existingStream, bootCamera]);

  useEffect(() => {
    stepStartRef.current = Date.now();

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
    if (!cameraReady || !video || !landmarkerRef.current) return;

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
  }, [cameraReady, step, lightOk, onStanceChange]);

  useEffect(() => {
    if (step === "mic" && micOk) {
      const t = window.setTimeout(() => setStep("done"), 600);
      return () => clearTimeout(t);
    }
  }, [micOk, step]);

  const statusLine =
    step === "done"
      ? `Ready · ${stanceLabel(detectedStance ?? stance)}`
      : step === "camera"
        ? bodyOk
          ? lightOk
            ? "Full body visible"
            : "Improve lighting"
          : "Step back — full body in frame"
        : step === "stance"
          ? detectedStance
            ? `${stanceLabel(detectedStance)} detected`
            : "Hold your stance"
          : step === "guard"
            ? guardOk
              ? "Guard set"
              : "Hands up by your chin"
            : micOk
              ? "Mic calibrated"
              : "Throw one punch at the bag";

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover ${
          mirrored ? "scale-x-[-1]" : ""
        } ${cameraReady ? "opacity-100" : "opacity-0"}`}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55" />

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

        <div className="mt-auto space-y-3">
          {cameraReady && step !== "done" && (
            <p className="text-center text-xs text-white/50">{statusLine}</p>
          )}

          {previewError && (
            <p className="text-center text-xs text-[#fa4141]/90">{previewError}</p>
          )}

          {!gpuOk && cameraReady && (
            <p className="text-center text-xs text-amber-400/80">
              Use Chrome on a modern phone for best accuracy
            </p>
          )}

          {!cameraReady && (
            <button
              type="button"
              onClick={() => void bootCamera()}
              disabled={starting}
              className="font-display flex h-14 w-full items-center justify-center rounded-full bg-[#fa4141] text-[15px] tracking-[0.14em] text-white disabled:opacity-60"
            >
              {starting ? "Opening camera…" : "Allow camera access"}
            </button>
          )}

          {cameraReady && step === "done" && (
            <button
              type="button"
              onClick={finish}
              className="font-display flex h-14 w-full items-center justify-center rounded-full bg-white text-[15px] tracking-[0.18em] text-black"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
