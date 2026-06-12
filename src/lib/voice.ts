import {
  getSignalLabel,
  speechLangCode,
  type AppLanguage,
} from "./i18n";
import type { SignalType } from "./types";

let voicesReady = false;
let currentLanguage: AppLanguage = "en";
let cachedVoice: SpeechSynthesisVoice | undefined;

type VoiceRole = "command" | "coach";

/** One delivery profile — natural male coach on device fallback */
const COACH_DELIVERY = { rate: 1.05, pitch: 1.0 };
const DELIVERY: Record<VoiceRole, { rate: number; pitch: number }> = {
  command: COACH_DELIVERY,
  coach: COACH_DELIVERY,
};

const FEMALE_VOICE =
  /samantha|victoria|karen|zira|susan|linda|heather|moira|tessa|fiona|kate|seri|kanya|nora|salli|joanna|ivy|kimberly|kendra|celine|marie|amelie|alice|yuna|meijia|sin-ji|yue|ting-ting|mei-jia|female|woman|girl|nina|hazel|sara|anna|ellen|veena|lekha|priya|tara|prempreeda|zira|siri/i;

const ROBOT_VOICE =
  /compact|espeak|robot|speech\s*synthesis|default|superuser|android/i;

export function setVoiceLanguage(lang: AppLanguage): void {
  if (lang !== currentLanguage) {
    currentLanguage = lang;
    cachedVoice = undefined;
  }
}

export function getVoiceLanguage(): AppLanguage {
  return currentLanguage;
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  return FEMALE_VOICE.test(voice.name);
}

function isRobotVoice(voice: SpeechSynthesisVoice): boolean {
  return ROBOT_VOICE.test(voice.name);
}

/** Prefer enhanced / natural male voices that sound human in the gym */
function scoreVoice(voice: SpeechSynthesisVoice, lang: AppLanguage): number {
  if (isFemaleVoice(voice)) return -100;
  if (isRobotVoice(voice)) return -40;

  let score = 0;
  const name = voice.name.toLowerCase();
  const locale = voice.lang.toLowerCase();
  const prefix = lang === "th" ? "th" : "en";

  if (!locale.startsWith(prefix)) return -50;

  if (/enhanced|premium|natural|neural|wavenet|hd/i.test(name)) score += 45;

  if (lang === "en") {
    if (/daniel/i.test(name)) score += 50;
    if (/aaron/i.test(name)) score += 42;
    if (/nathan/i.test(name)) score += 38;
    if (/\balex\b/i.test(name)) score += 36;
    if (/evan|james|oliver|thomas|ryan|tony|guy|fred|arthur|david|mark|paul|gordon/i.test(name)) {
      score += 24;
    }
    if (locale.startsWith("en-gb")) score += 8;
    if (locale.startsWith("en-us")) score += 4;
  }

  if (lang === "th") {
    if (/krit|pattara|super/i.test(name)) score += 30;
    if (/male/i.test(name)) score += 12;
  }

  if (voice.localService) score += 8;

  return score;
}

function pickVoice(lang: AppLanguage, force = false): SpeechSynthesisVoice | undefined {
  if (cachedVoice && !force) {
    const prefix = lang === "th" ? "th" : "en";
    if (cachedVoice.lang.toLowerCase().startsWith(prefix)) {
      return cachedVoice;
    }
  }

  const voices = loadVoices();
  if (voices.length === 0) return undefined;

  const prefix = lang === "th" ? "th" : "en";
  const candidates = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(prefix)
  );

  const ranked = [...candidates].sort(
    (a, b) => scoreVoice(b, lang) - scoreVoice(a, lang)
  );

  let best = ranked.find((v) => scoreVoice(v, lang) > 0);

  if (!best && lang !== "en") {
    return pickVoice("en", force);
  }

  if (!best) {
    best =
      ranked.find((v) => !isFemaleVoice(v) && !isRobotVoice(v)) ??
      ranked.find((v) => !isFemaleVoice(v)) ??
      voices.find((v) => scoreVoice(v, lang) > 0);
  }

  cachedVoice = best;
  return best;
}

function formatForRole(text: string, role: VoiceRole, lang: AppLanguage): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  if (role === "coach") {
    return trimmed
      .replace(/\s*—\s*/g, ", ")
      .replace(/\s*-\s*/g, ", ");
  }

  if (lang === "en" && trimmed.length <= 18 && !/[.!?]$/.test(trimmed)) {
    return `${trimmed}!`;
  }

  return trimmed;
}

function applyVoice(
  utterance: SpeechSynthesisUtterance,
  lang: AppLanguage,
  role: VoiceRole
): void {
  utterance.lang = speechLangCode(lang);
  const profile = DELIVERY[role];
  utterance.rate = profile.rate;
  utterance.pitch = profile.pitch;

  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
}

function speak(
  text: string,
  volume: number,
  lang: AppLanguage,
  role: VoiceRole
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  pickVoice(lang, !voicesReady);

  window.speechSynthesis.cancel();

  const phrase = formatForRole(text, role, lang);
  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.volume = volume;
  applyVoice(utterance, lang, role);

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function initVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const refresh = () => {
    voicesReady = loadVoices().length > 0;
    cachedVoice = undefined;
    pickVoice(currentLanguage, true);
  };

  refresh();
  window.speechSynthesis.onvoiceschanged = refresh;
}

export function speakText(text: string, volume = 0.9, lang = currentLanguage): void {
  speak(text, volume, lang, "command");
}

export function speakSignal(
  type: SignalType,
  volume = 0.9,
  lang = currentLanguage
): void {
  speak(getSignalLabel(type, lang), volume, lang, "command");
}

/** Corner-man coaching — same delivery as signal calls */
export function speakCoachCue(
  text: string,
  volume = 0.88,
  lang = currentLanguage
): void {
  speak(text, volume, lang, "coach");
}

export function speakCoachCueAsync(
  text: string,
  volume = 0.88,
  lang = currentLanguage
): Promise<void> {
  const utterance = speak(text, volume, lang, "coach");
  if (!utterance) return Promise.resolve();
  return new Promise((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
  });
}

export function stopVoice(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function getVoiceLabel(type: SignalType, lang = currentLanguage): string {
  return getSignalLabel(type, lang);
}
