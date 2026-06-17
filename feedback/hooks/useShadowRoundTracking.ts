"use client";

import { useEffect, useRef, useState } from "react";
import type { FrameLandmarks } from "@/types";
import type { GuardCalibration } from "@/lib/analysis/poseMetrics";
import {
  buildShadowboxingCoachingCopy,
  calibrateGuardFromNeutralFrames,
  createShadowboxingStats,
  guardUptimePercent,
  ingestShadowboxingFrame,
  isNeutralGuardFrame,
  issueCount,
  positiveCount,
  type ShadowboxingStats,
} from "@/lib/shadow/shadowboxingMetrics";
import type { ShadowDropEvent, ShadowRoundResult } from "@/lib/shadow/types";

export type ShadowRoundPhase = "idle" | "calibrating" | "active" | "done";

interface UseShadowRoundTrackingOptions {
  landmarks: FrameLandmarks | null;
  phase: ShadowRoundPhase;
  elapsedSec: number;
  roundSeconds: number;
}

export function useShadowRoundTracking({
  landmarks,
  phase,
  elapsedSec,
  roundSeconds,
}: UseShadowRoundTrackingOptions) {
  const [calibration, setCalibration] = useState<GuardCalibration | null>(null);
  const [stats, setStats] = useState<ShadowboxingStats>(() => createShadowboxingStats());
  const [calibrateFrames, setCalibrateFrames] = useState(0);
  const [activeWarning, setActiveWarning] = useState<ShadowDropEvent["hand"] | null>(
    null
  );
  const neutralBufferRef = useRef<FrameLandmarks[]>([]);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "calibrating" && phase !== "active") return;
    if (!landmarks) return;

    if (phase === "calibrating") {
      if (isNeutralGuardFrame(landmarks)) {
        neutralBufferRef.current.push(landmarks);
        setCalibrateFrames((n) => n + 1);
      }
      return;
    }

    if (phase === "active" && calibration) {
      setStats((prev) => {
        const next = ingestShadowboxingFrame(prev, landmarks, calibration, elapsedSec);
        const metricsDropped =
          next.dropCount > prev.dropCount
            ? next.drops[next.drops.length - 1]?.hand ?? null
            : null;

        if (metricsDropped) {
          setActiveWarning(metricsDropped);
          if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
          warningTimerRef.current = setTimeout(() => setActiveWarning(null), 450);
        }

        return next;
      });
    }
  }, [landmarks, phase, calibration, elapsedSec]);

  const finishCalibration = (): GuardCalibration | null => {
    const cal = calibrateGuardFromNeutralFrames(neutralBufferRef.current);
    setCalibration(cal);
    return cal;
  };

  const resetTracking = () => {
    neutralBufferRef.current = [];
    setCalibration(null);
    setStats(createShadowboxingStats());
    setCalibrateFrames(0);
    setActiveWarning(null);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  };

  const buildResult = (): ShadowRoundResult => {
    const coaching = buildShadowboxingCoachingCopy(stats);
    return {
      roundSeconds,
      completedAt: new Date().toISOString(),
      moments: stats.moments,
      issueCount: issueCount(stats),
      positiveCount: positiveCount(stats),
      dropCount: stats.dropCount,
      guardUptimePercent: guardUptimePercent(stats),
      reliableFrameCount: stats.reliableFrames,
      mechanicalFix: coaching.mechanicalFix,
      drillName: coaching.drillName,
      summary: coaching.summary,
      drops: stats.drops,
    };
  };

  return {
    calibration,
    stats,
    calibrateFrames,
    activeWarning,
    finishCalibration,
    resetTracking,
    buildResult,
    guardUptimePercent: guardUptimePercent(stats),
    issueCount: issueCount(stats),
    positiveCount: positiveCount(stats),
  };
}
