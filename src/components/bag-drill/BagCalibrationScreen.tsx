"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { CAMERA_MODE_COPY } from "@/components/bag-drill/bag-ui";
import {
  brightnessOk,
  calibrationFromThudHits,
  sampleFrameBrightness,
  stanceLabel,
  type BagCalibration,
  type BagStance,
} from "@/lib/bag-drill/calibration";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { saveCalibration } from "@/lib/bag-drill/detection/calibration-store";
import {
  BagThudDetector,
  type BagThudHit,
} from "@/lib/bag-drill/detection/bag-thud-detector";
import {
  createPoseLandmarker,
  detectPose,
} from "@/lib/bag-drill/detection/pose-landmarker";
import { bodyVisible, cameraAngleStatus, detectStance } from "@/lib/bag-drill/detection/landmarks";
import type { CameraAngleIssue } from "@/lib/bag-drill/detection/landmarks";
import { GuardMonitor } from "@/lib/bag-drill/detection/guard-monitor";
import { CalibrationCameraGuideModal } from "@/components/bag-drill/CalibrationCameraGuideModal";
import {
  appendMicrophoneToCapture,
  attachExistingStream,
  detachVideoPreview,
  isIOSDevice,
  reacquireMediaWithMicrophone,
  releaseVideoPreview,
  startMediaCapture,
} from "@/lib/bag-drill/media-capture";
import { unlockBagAudio } from "@/lib/bag-drill/audio-queue";
import { MicListenPanel } from "@/components/bag-drill/MicListenPanel";
import type { BagCameraMode } from "@/lib/bag-drill/types";
import type { CalibrationPurpose } from "@/lib/bag-drill/calibration-purpose";
import { isMicOnlyCalibration } from "@/lib/bag-drill/calibration-purpose";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

type CalStep = "camera" | "stance" | "guard" | "mic" | "done";
type FlowStep = Exclude<CalStep, "done">;

const STEP_MS = 3000;
const CALIBRATION_HITS = 5;

interface BagCalibrationScreenProps {
  purpose?: CalibrationPurpose;
  cameraMode: BagCameraMode;
  stance: BagStance;
  existingStream?: MediaStream | null;
  onStanceChange: (stance: BagStance) => void;
  onCameraModeChange?: (mode: BagCameraMode) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  onBack: () => void;
  onComplete: (calibration: BagCalibration) => void;
}

export function BagCalibrationScreen({
  purpose = "combo",
  cameraMode,
  stance,
  existingStream = null,
  onStanceChange,
  onCameraModeChange,
  onStreamChange,
  onBack,
  onComplete,
}: BagCalibrationScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const thudRef = useRef<BagThudDetector | null>(null);
  const thudHitsRef = useRef<BagThudHit[]>([]);
  const guardMonitorRef = useRef(new GuardMonitor());
  const guardBaselineRef = useRef<ReturnType<GuardMonitor["calibrateFromLandmarks"]> | null>(
    null
  );
  const stepStartRef = useRef(0);
  const stepRef = useRef<CalStep>("camera");
  const rafRef = useRef<number | null>(null);
  const allowExistingStreamRef = useRef(true);
  const guideShownRef = useRef(false);

  const [activeCameraMode, setActiveCameraMode] = useState(cameraMode);
  const [step, setStep] = useState<CalStep>(
    isMicOnlyCalibration(purpose) ? "mic" : "camera"
  );
  stepRef.current = step;
  const [guideOpen, setGuideOpen] = useState(false);
  const [detectedStance, setDetectedStance] = useState<BagStance | null>(null);
  const [guardOk, setGuardOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [lightOk, setLightOk] = useState(false);
  const [bodyOk, setBodyOk] = useState(false);
  const [angleOk, setAngleOk] = useState(false);
  const [angleIssue, setAngleIssue] = useState<CameraAngleIssue>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [gpuOk, setGpuOk] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [testPunchCount, setTestPunchCount] = useState(0);
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(existingStream);
  const [starting, setStarting] = useState(false);
  const [envLabel, setEnvLabel] = useState<string | null>(null);
  const startingRef = useRef(false);

  const fighterCam = activeCameraMode === "fighter";
  const poseCalibration = fighterCam && !isMicOnlyCalibration(purpose);
  const flowSteps: readonly FlowStep[] = poseCalibration
    ? ["camera", "stance", "guard", "mic"]
    : ["mic"];
  const drillCopy = BAG_COPY.drillCalibration[purpose];
  const micCopy = isMicOnlyCalibration(purpose)
    ? BAG_COPY.drillCalibration[purpose as "speed" | "flurry"].mic
    : null;

  const finish = useCallback(() => {
    const baseline = guardBaselineRef.current ?? {
      left: 0,
      right: 0,
      chinY: 0,
    };

    const ambientFloor =
      thudRef.current?.getProfile()?.ambientFloor ??
      thudHitsRef.current[0]?.peakVolume ??
      20;

    const cal = calibrationFromThudHits(thudHitsRef.current, ambientFloor, {
      stance: detectedStance ?? stance,
      lightingOk: poseCalibration ? lightOk : true,
      brightness: poseCalibration ? brightness : 0.35,
      frameConfirmed: poseCalibration ? bodyOk && angleOk : false,
      poseReady: poseCalibration ? bodyOk && angleOk : false,
      guardBaseline: poseCalibration ? baseline : undefined,
      gpuDelegate: gpuOk,
    });
    saveCalibration(cal);
    onComplete(cal);
  }, [stance, detectedStance, lightOk, brightness, bodyOk, angleOk, gpuOk, poseCalibration, onComplete]);

  const bootCamera = useCallback(
    async (mode?: BagCameraMode, forceFresh = false) => {
    const video = videoRef.current;
    if (!video || startingRef.current) return;

    const useMode = mode ?? activeCameraMode;
    const useFighterCam = useMode === "fighter";

    startingRef.current = true;
    setStarting(true);
    setPreviewError(null);
    void unlockBagAudio();
    landmarkerRef.current?.close();
    landmarkerRef.current = null;

    const canReuse =
      !forceFresh &&
      allowExistingStreamRef.current &&
      existingStream?.getVideoTracks().some((track) => track.readyState === "live");

    if (canReuse) {
      detachVideoPreview(video);
    } else {
      stopRef.current?.();
      releaseVideoPreview(video);
    }

    const result = canReuse
      ? await attachExistingStream(video, existingStream!)
      : await startMediaCapture(video, {
          facingMode: useFighterCam ? "user" : "environment",
          highQuality: false,
        });

    stopRef.current = result.handles.stop;
    if (result.handles.stream) {
      setCaptureStream(result.handles.stream);
    }
    if (result.handles.stream && result.handles.stream !== existingStream) {
      onStreamChange?.(result.handles.stream);
    }
    setCameraReady(result.hasCamera);
    setMicReady(result.hasMic);
    setPreviewError(
      !result.hasCamera
        ? result.error ?? "Camera blocked — tap Allow camera below"
        : !result.hasMic
          ? result.error
          : null
    );

    try {
      if (useFighterCam && !isMicOnlyCalibration(purpose)) {
        const { landmarker, gpu } = await createPoseLandmarker();
        landmarkerRef.current = landmarker;
        setGpuOk(gpu);
      } else {
        landmarkerRef.current = null;
        setGpuOk(true);
      }
    } catch {
      setPreviewError("Pose model failed to load");
    }

    if (result.handles.stream) {
      thudRef.current?.stop();
      thudRef.current = null;
    }

    startingRef.current = false;
    setStarting(false);
  },
    [activeCameraMode, existingStream, onStreamChange, purpose]
  );

  const enableMicrophone = useCallback(async () => {
    const video = videoRef.current;
    if (!video || startingRef.current) return;

    startingRef.current = true;
    setStarting(true);
    setPreviewError(null);
    void unlockBagAudio();

    const facing = activeCameraMode === "fighter" ? "user" : "environment";
    const stream = (video.srcObject as MediaStream | null) ?? captureStream;

    let result;
    if (isIOSDevice()) {
      result = await reacquireMediaWithMicrophone(video, facing, stream);
    } else {
      if (!stream) {
        startingRef.current = false;
        setStarting(false);
        return;
      }
      const handles = {
        stream,
        videoEl: video,
        audioContext: null,
        stop: stopRef.current ?? (() => {}),
      };
      const mic = await appendMicrophoneToCapture(handles);
      stopRef.current = handles.stop;
      result = {
        handles,
        hasCamera: Boolean(stream.getVideoTracks().length),
        hasMic: mic.hasMic,
        error: mic.error,
      };
    }

    stopRef.current = result.handles.stop;
    if (result.handles.stream) {
      setCaptureStream(result.handles.stream);
      if (result.handles.stream !== existingStream) {
        onStreamChange?.(result.handles.stream);
      }
    }
    setCameraReady(result.hasCamera);
    setMicReady(result.hasMic);
    setPreviewError(result.hasMic ? null : result.error);

    if (result.hasMic && stepRef.current === "mic") {
      thudHitsRef.current = [];
      setTestPunchCount(0);
      setMicOk(false);
      thudRef.current?.stop();
      thudRef.current = new BagThudDetector({
        calibrating: true,
        onCalibrationHit: (hit) => {
          thudHitsRef.current.push(hit);
          setTestPunchCount(thudHitsRef.current.length);
          if (thudHitsRef.current.length >= CALIBRATION_HITS) setMicOk(true);
        },
        onEnvironment: (_env, label) => setEnvLabel(label),
      });
      if (result.handles.stream) {
        void thudRef.current.start(result.handles.stream);
      }
    }

    startingRef.current = false;
    setStarting(false);
  }, [activeCameraMode, captureStream, existingStream, onStreamChange]);

  const switchToYou = useCallback(async () => {
    if (startingRef.current || activeCameraMode === "fighter") return;

    allowExistingStreamRef.current = false;
    existingStream?.getTracks().forEach((track) => track.stop());
    onStreamChange?.(null);

    setActiveCameraMode("fighter");
    onCameraModeChange?.("fighter");
    setStep("camera");
    setDetectedStance(null);
    setGuardOk(false);
    setMicOk(false);
    setBodyOk(false);
    setAngleOk(false);
    setAngleIssue(null);
    setLightOk(false);
    setBrightness(0);
    thudHitsRef.current = [];
    guardBaselineRef.current = null;
    stepStartRef.current = Date.now();
    setCameraReady(false);
    setMicReady(false);

    await bootCamera("fighter", true);
  }, [
    activeCameraMode,
    bootCamera,
    existingStream,
    onCameraModeChange,
    onStreamChange,
  ]);

  useEffect(() => {
    const hasLiveStream = existingStream?.getVideoTracks().some(
      (track) => track.readyState === "live"
    );
    if (hasLiveStream) {
      void bootCamera();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      thudRef.current?.stop();
      landmarkerRef.current?.close();
      stopRef.current?.();
    };
  }, [bootCamera, existingStream]);

  useEffect(() => {
    if (step === "camera" && poseCalibration && cameraReady && !guideShownRef.current) {
      setGuideOpen(true);
      guideShownRef.current = true;
    }
  }, [step, poseCalibration, cameraReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    void video.play().catch(() => {});
  }, [cameraReady]);

  useEffect(() => {
    stepStartRef.current = Date.now();

    if (step === "mic") {
      thudHitsRef.current = [];
      setTestPunchCount(0);
      setMicOk(false);
      const stream =
        (videoRef.current?.srcObject as MediaStream | null) ?? captureStream;
      if (!stream) return;

      thudRef.current?.stop();
      thudRef.current = new BagThudDetector({
        calibrating: true,
        onCalibrationHit: (hit) => {
          thudHitsRef.current.push(hit);
          setTestPunchCount(thudHitsRef.current.length);
          if (thudHitsRef.current.length >= CALIBRATION_HITS) setMicOk(true);
        },
        onEnvironment: (_env, label) => setEnvLabel(label),
      });
      void thudRef.current.start(stream);
    } else {
      thudRef.current?.stop();
    }
  }, [step, captureStream]);

  useEffect(() => {
    if (cameraReady && !poseCalibration && step === "camera") {
      setStep("mic");
      stepStartRef.current = Date.now();
    }
  }, [cameraReady, poseCalibration, step]);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraReady || !video || !landmarkerRef.current || !poseCalibration) return;

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
          const angle = cameraAngleStatus(landmarks);
          setBodyOk(visible);
          setAngleOk(angle.ok);
          setAngleIssue(angle.issue);
          void sampleFrameBrightness(v).then((score) => {
            setBrightness(score);
            const ok = brightnessOk(score);
            setLightOk(ok);
            const stepElapsed = Date.now() - stepStartRef.current;
            if (
              visible &&
              angle.ok &&
              ok &&
              stepElapsed >= STEP_MS &&
              stepRef.current === "camera"
            ) {
              setStep("stance");
              stepStartRef.current = Date.now();
            }
          });
        }

        if (step === "stance") {
          const s = detectStance(landmarks);
          setDetectedStance(s);
          onStanceChange(s);
          if (elapsed >= STEP_MS) {
            setStep("guard");
            stepStartRef.current = Date.now();
          }
        }

        if (step === "guard") {
          guardBaselineRef.current = guardMonitorRef.current.calibrateFromLandmarks(
            landmarks,
            v.videoHeight
          );
          if (elapsed >= STEP_MS) {
            setGuardOk(true);
            setStep("mic");
            stepStartRef.current = Date.now();
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cameraReady, step, onStanceChange, poseCalibration]);

  useEffect(() => {
    if (step === "mic" && micOk) {
      const t = window.setTimeout(() => setStep("done"), 600);
      return () => clearTimeout(t);
    }
  }, [micOk, step]);

  const totalSteps = flowSteps.length;
  const stepIndex =
    step === "done"
      ? totalSteps
      : Math.max(1, flowSteps.indexOf(step) + 1);

  const steps = BAG_COPY.calibrationSteps;
  const angleHints = BAG_COPY.calibrationAngleHints;

  const stepHint: Record<CalStep, string> = {
    camera: !bodyOk
      ? "Move back until head and feet are in view"
      : !angleOk && angleIssue === "too_profile"
        ? angleHints.too_profile
        : !angleOk && angleIssue === "too_frontal"
          ? angleHints.too_frontal
          : !lightOk
            ? "Too dark — add light or face a window"
            : "Angle and lighting look good — hold still…",
    stance: detectedStance
      ? `${stanceLabel(detectedStance)} detected — hold still`
      : "Hold your stance for 3 seconds",
    guard: guardOk ? "Guard set" : "Keep hands by your chin",
    mic: micOk
      ? "Bag thud profile saved"
      : `Hit the bag ${CALIBRATION_HITS} times normally`,
    done: poseCalibration
      ? `Ready — ${stanceLabel(detectedStance ?? stance)} stance saved`
      : "Ready — mic tuned for bag hits",
  };

  const stepStatus: Record<CalStep, string> = {
    camera: "Checking camera and lighting",
    stance: "Reading your stance",
    guard: "Setting your guard baseline",
    mic: "Tuning punch detection",
    done: "Calibration complete",
  };

  const cameraStepBlocked =
    step === "camera" && (!bodyOk || !angleOk || !lightOk);

  const devSkipEnabled = process.env.NODE_ENV === "development";

  const skipToStep = useCallback((target: CalStep) => {
    stepStartRef.current = Date.now();
    setStep(target);

    if (target === "camera") {
      setBodyOk(false);
      setAngleOk(false);
      setAngleIssue(null);
      setLightOk(false);
      setDetectedStance(null);
      setGuardOk(false);
      setMicOk(false);
      return;
    }

    setBodyOk(true);
    setAngleOk(true);
    setLightOk(true);

    if (target === "stance") {
      setDetectedStance(null);
      setGuardOk(false);
      setMicOk(false);
      return;
    }

    if (target === "guard") {
      setDetectedStance(detectedStance ?? stance);
      setGuardOk(false);
      setMicOk(false);
      return;
    }

    if (target === "mic") {
      setDetectedStance(detectedStance ?? stance);
      setGuardOk(true);
      setMicOk(false);
      return;
    }

    setDetectedStance(detectedStance ?? stance);
    setGuardOk(true);
    setMicOk(true);
  }, [detectedStance, stance]);

  const devStepButtons: { id: CalStep; label: string }[] = poseCalibration
    ? [
        { id: "camera", label: "1 · Angle" },
        { id: "stance", label: "2 · Stance" },
        { id: "guard", label: "3 · Guard" },
        { id: "mic", label: "4 · Mic" },
        { id: "done", label: "Done" },
      ]
    : [
        { id: "mic", label: "1 · Mic" },
        { id: "done", label: "Done" },
      ];

  const micWarning =
    cameraReady && !micReady
      ? "Microphone blocked — punch counting may be limited"
      : null;

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#161616] via-black to-[#0a0a0a]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.04)_0%,transparent_50%)]"
        aria-hidden
      />

      {/* Hidden feed — pose/mic still run, covered by gradient */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 ${
          fighterCam ? "scale-x-[-1]" : ""
        }`}
        aria-hidden
      />

      <CalibrationCameraGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <BackButton
              onClick={onBack}
              className="border-white/20 bg-black/40 text-white backdrop-blur-sm"
            />

            <div className="flex items-center gap-2">
              {cameraReady && poseCalibration && step === "camera" && (
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[9px] font-medium uppercase tracking-wider text-white/70 hover:bg-white/10"
                >
                  Camera tips
                </button>
              )}
              {cameraReady && poseCalibration && (
                <span className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[9px] font-medium uppercase tracking-wider text-white/55">
                  {CAMERA_MODE_COPY.fighter.flipLabel}
                </span>
              )}
              {cameraReady && !poseCalibration && (
                <button
                  type="button"
                  onClick={() => void switchToYou()}
                  disabled={starting}
                  className="rounded-full border border-[#fa4141]/35 bg-black/40 px-3 py-2 text-[9px] font-medium uppercase tracking-wider text-[#fa4141] hover:bg-white/10 disabled:opacity-50"
                >
                  Switch to You
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {flowSteps.map((s, i) => (
              <span
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  step === s || (step === "done" && i < flowSteps.length)
                    ? "bg-[#fa4141]"
                    : step !== "done" && flowSteps.indexOf(step) > i
                      ? "bg-emerald-500"
                      : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </header>

        {devSkipEnabled && cameraReady && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {devStepButtons.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => skipToStep(item.id)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide ${
                  step === item.id
                    ? "border-[#fa4141]/60 bg-[#fa4141]/15 text-[#fa4141]"
                    : "border-white/15 bg-white/[0.04] text-white/50 hover:text-white/75"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1" aria-hidden />

        <footer className="shrink-0 space-y-3 border-t border-white/[0.06] pt-4">
          {cameraReady ? (
            <>
              <div>
                <p className="label text-white/45">
                  {drillCopy.eyebrow} · {stepStatus[step]} · step {stepIndex}/{totalSteps}
                </p>
                <h1 className="font-display mt-2 text-[1.65rem] leading-tight tracking-wide text-white">
                  {micCopy
                    ? step === "done"
                      ? micCopy.done
                      : micCopy.step
                    : steps[step]}
                </h1>
                {micCopy && step === "mic" && (
                  <p className="mt-2 text-xs leading-relaxed text-white/45">
                    {"fighterNote" in micCopy && fighterCam
                      ? micCopy.fighterNote
                      : "bagNote" in micCopy
                        ? micCopy.bagNote
                        : "note" in micCopy
                          ? micCopy.note
                          : null}
                  </p>
                )}
                {!poseCalibration && step === "mic" && !micCopy && (
                  <p className="mt-2 text-xs leading-relaxed text-white/45">
                    {BAG_COPY.calibrationBagNote}
                  </p>
                )}
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    cameraStepBlocked
                      ? "text-[#fa4141]/90"
                      : (step === "mic" && !micOk) ||
                          (step === "stance" && !detectedStance) ||
                          (step === "guard" && !guardOk)
                        ? "text-white/70"
                        : "text-emerald-400/85"
                  }`}
                >
                  {stepHint[step]}
                </p>
              </div>

              {(micWarning || previewError) && (
                <div className="space-y-2">
                  {micWarning && (
                    <p className="text-sm leading-relaxed text-[#fa4141]/90">
                      {micWarning}
                    </p>
                  )}
                  {previewError && previewError !== micWarning && (
                    <p className="text-sm leading-relaxed text-[#fa4141]/90">
                      {previewError}
                    </p>
                  )}
                </div>
              )}

              {!gpuOk && (
                <p className="text-xs leading-relaxed text-amber-400/80">
                  {BAG_COPY.calibrationGpuTip}
                </p>
              )}

              {step === "mic" && (
                <MicListenPanel
                  stream={captureStream}
                  hitsRequired={CALIBRATION_HITS}
                  hitsDetected={testPunchCount}
                  onEnableMic={() => void enableMicrophone()}
                  enabling={starting}
                />
              )}

              {step === "mic" && envLabel && (
                <p className="text-xs leading-relaxed text-white/45">{envLabel}</p>
              )}

              {step === "done" ? (
                <button
                  type="button"
                  onClick={finish}
                  className="font-display flex h-14 w-full items-center justify-center rounded-full bg-white text-[15px] tracking-[0.18em] text-black"
                >
                  Continue
                </button>
              ) : isMicOnlyCalibration(purpose) && cameraReady ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={finish}
                    className="font-display flex h-11 w-full items-center justify-center rounded-full border border-white/15 text-[11px] tracking-[0.14em] text-white/70"
                  >
                    {micCopy?.skip ?? "Skip calibration"}
                  </button>
                  <p className="text-center text-[11px] leading-relaxed text-white/35">
                    {micCopy?.skipHint ?? "Counts may be less accurate."}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div>
                <p className="label text-white/45">Calibration · step 1/4</p>
                <h1 className="font-display text-[1.65rem] leading-tight tracking-wide text-white">
                  Allow camera access
                </h1>
                <p className="mt-2 text-sm text-white/65">
                  {BAG_COPY.calibrationPermission}
                </p>
              </div>
              {previewError && (
                <p className="text-sm text-[#fa4141]/90">{previewError}</p>
              )}
              <button
                type="button"
                onClick={() => void bootCamera()}
                disabled={starting}
                className="font-display flex h-14 w-full items-center justify-center rounded-full bg-[#fa4141] text-[15px] tracking-[0.14em] text-white disabled:opacity-60"
              >
                {starting ? "Opening camera…" : "Allow camera & microphone"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
