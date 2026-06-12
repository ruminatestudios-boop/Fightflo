"use client";

import type { BagDifficulty } from "./types";
import { resolveComboAudio } from "./audio/combo-resolver";
import {
  ENCOURAGEMENT_FILES,
  GUARD_FILES,
} from "./audio/cues";
import {
  interruptAudio,
  isBagAudioPlaying,
  queueAudio,
  stopBagAudio,
  unlockBagAudio,
} from "./audio-queue";

export function isSpeaking(): boolean {
  return isBagAudioPlaying();
}

export function stopSpeech(): void {
  stopBagAudio();
}

export async function prepareBagSpeech(): Promise<void> {
  await unlockBagAudio();
}

export function speakCombo(
  text: string,
  _difficulty: BagDifficulty,
  options?: { prefix?: string; onEnd?: () => void }
): void {
  const file = resolveComboAudio(text, options?.prefix);
  queueAudio(file, { onEnd: options?.onEnd });
}

export function speakGuardWarning(kind: "left" | "right" | "both"): void {
  const file = GUARD_FILES[kind];
  interruptAudio(file);
}

export function speakEncouragement(): void {
  const file =
    ENCOURAGEMENT_FILES[Math.floor(Math.random() * ENCOURAGEMENT_FILES.length)];
  queueAudio(file);
}

export function speakSessionStart(): void {
  queueAudio("session-start.mp3");
}

export function speakSessionReady(): void {
  queueAudio("session-ready.mp3");
}

export function speakSessionEnd(): void {
  queueAudio("session-end.mp3");
}

export function speakMilestone(kind: "10" | "half" | "20"): void {
  const files = {
    "10": "milestone-10.mp3",
    half: "milestone-half.mp3",
    "20": "milestone-20.mp3",
  } as const;
  queueAudio(files[kind]);
}
