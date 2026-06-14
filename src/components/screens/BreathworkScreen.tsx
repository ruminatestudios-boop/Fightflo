"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { audioEngine } from "@/lib/audio";
import { cancelCoachVoice, speakCoachLine, unlockCoachAudio } from "@/lib/coach-voice";
import type { SessionStats } from "@/lib/types";
import { AppTopBar } from "@/components/ui/AppTopBar";

interface BreathworkScreenProps {
  durationSeconds?: number;
  onComplete: (stats: SessionStats, durationSeconds: number) => void;
  onStop: () => void;
}

type BreathPhase = "inhale" | "hold" | "exhale";

const INHALE = 4;
const HOLD = 1;
const EXHALE = 6;

const CUES: Record<BreathPhase, string> = {
  inhale: "Inhale",
  hold: "Hold",
  exhale: "Exhale",
};

export function BreathworkScreen({
  durationSeconds = 180,
  onComplete,
  onStop,
}: BreathworkScreenProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [phaseTick, setPhaseTick] = useState(INHALE);
  const startRef = useRef(Date.now());
  const voicedRef = useRef<string | null>(null);

  const cycleLength = INHALE + HOLD + EXHALE;

  useEffect(() => {
    void unlockCoachAudio();
    audioEngine.startAmbience();
    return () => {
      cancelCoachVoice();
      audioEngine.stopAmbience();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          const elapsed = Math.round((Date.now() - startRef.current) / 1000);
          onComplete(
            {
              style: "muay-thai",
              mode: "easy",
              workoutMode: "solo",
              challengeName: "Breathwork Recovery",
              totalSignals: 0,
              reactionScore: 72,
              pressureRating: "LOW",
              roundsCompleted: 1,
              totalRounds: 1,
              survived: true,
              trainingCategory: "breathwork",
            },
            elapsed
          );
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const tick = setInterval(() => {
      setPhaseTick((t) => {
        const next = t - 1;
        if (next > 0) return next;

        setPhase((p) => {
          const order: BreathPhase[] = ["inhale", "hold", "exhale"];
          const idx = order.indexOf(p);
          const nextPhase = order[(idx + 1) % order.length];
          const duration =
            nextPhase === "inhale" ? INHALE : nextPhase === "hold" ? HOLD : EXHALE;
          setPhaseTick(duration);
          return nextPhase;
        });
        return INHALE;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const speakPhase = useCallback((text: string) => {
    if (voicedRef.current === text) return;
    voicedRef.current = text;
    void speakCoachLine(text, 0.7, "en");
  }, []);

  useEffect(() => {
    speakPhase(CUES[phase]);
  }, [phase, speakPhase]);

  const scale =
    phase === "inhale" ? 1.15 : phase === "exhale" ? 0.85 : 1;
  const animDuration = phase === "inhale" ? INHALE : phase === "exhale" ? EXHALE : HOLD;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#050505] to-black" />

      <div className="app-shell relative z-10 px-5 pt-10">
        <AppTopBar
          trailing={
            <button
              type="button"
              onClick={onStop}
              className="rounded-xl border border-white/[0.12] px-4 py-2 text-xs text-[#8e9297] transition-colors hover:text-white"
            >
              End
            </button>
          }
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <div className="text-center">
          <p className="label text-[#525252]">Recovery</p>
          <h2 className="font-display mt-2 text-3xl tracking-wide text-white">
            Control breathing
          </h2>
          <p className="mt-2 text-sm text-[#525252]">
            {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, "0")} remaining
          </p>
        </div>

        <div className="relative flex h-64 w-64 items-center justify-center">
          <motion.div
            className="absolute h-56 w-56 rounded-full border border-white/[0.06]"
            animate={{ scale, opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: animDuration, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute h-40 w-40 rounded-full bg-[#4ade80]/5"
            animate={{ scale, opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: animDuration, ease: "easeInOut" }}
          />
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="font-display text-4xl uppercase tracking-[0.2em] text-white"
            >
              {CUES[phase]}
            </motion.p>
          </AnimatePresence>
        </div>

        <p className="max-w-xs text-center text-sm text-[#737373]">
          Slow down · recover · reset mentally
        </p>
      </div>
    </div>
  );
}
