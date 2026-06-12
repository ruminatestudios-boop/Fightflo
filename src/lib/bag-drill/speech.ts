import {
  cancelCoachVoice,
  initCoachVoice,
  speakCoachLine,
  unlockCoachAudio,
} from "@/lib/coach-voice";
import type { BagDifficulty } from "./types";
import { DIFFICULTY_SPEECH_RATE } from "./combos";

let speaking = false;
let endCallback: (() => void) | null = null;

/** Natural phrasing for combo calls — avoids robotic dash lists */
function formatComboSpeech(text: string, prefix?: string): string {
  const body = text
    .trim()
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ");
  return prefix ? `${prefix}${body}` : body;
}

export function isSpeaking(): boolean {
  return speaking;
}

export function stopSpeech(): void {
  endCallback = null;
  speaking = false;
  cancelCoachVoice();
  if (typeof window !== "undefined") {
    window.speechSynthesis.cancel();
  }
}

export async function prepareBagSpeech(): Promise<void> {
  if (typeof window === "undefined") return;
  await unlockCoachAudio();
  void initCoachVoice("en");
}

export function speakCombo(
  text: string,
  difficulty: BagDifficulty,
  options?: { prefix?: string; onEnd?: () => void }
): void {
  if (typeof window === "undefined") {
    options?.onEnd?.();
    return;
  }

  const phrase = formatComboSpeech(text, options?.prefix);
  speaking = true;
  endCallback = options?.onEnd ?? null;

  const finish = () => {
    speaking = false;
    const cb = endCallback;
    endCallback = null;
    cb?.();
  };

  // Slight pace tweak via shorter/longer phrasing — coach TTS handles delivery
  void initCoachVoice("en").then((geminiOk) => {
    if (geminiOk) {
      speakCoachLine(phrase, 0.92, "en", {
        onEnd: finish,
        onStart: () => {
          speaking = true;
        },
      });
      return;
    }

    // Device fallback — same voice picker as main app coach
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = Math.min(1.08, DIFFICULTY_SPEECH_RATE[difficulty] * 0.95);
    utterance.pitch = 0.96;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /daniel|aaron|nathan|enhanced|natural/i.test(v.name));
    if (preferred) utterance.voice = preferred;

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}
