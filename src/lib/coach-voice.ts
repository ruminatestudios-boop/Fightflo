"use client";

import type { AppLanguage } from "./i18n";
import { speakCoachCueAsync, stopVoice } from "./voice";

/**
 * One coach voice: Gemini TTS when available, best device voice as fallback.
 * Single queue — never overlaps.
 */
const COACH_PLAYBACK_RATE = 1.02;
const FETCH_RETRIES = 2;
const QUOTA_COOLDOWN_MS = 5 * 60 * 1000;

export interface CoachSpeakHooks {
  onStart?: () => void;
  onEnd?: () => void;
}

const audioCache = new Map<string, ArrayBuffer>();
let sharedCtx: AudioContext | null = null;
let coachVoiceReady: boolean | null = null;
let geminiQuotaUntil = 0;
let activeSource: AudioBufferSourceNode | null = null;
let speakChain: Promise<void> = Promise.resolve();
let voiceEpoch = 0;

function cacheKey(text: string, lang: AppLanguage): string {
  return `v6:${lang}:${text.trim().toLowerCase()}`;
}

function geminiAvailable(): boolean {
  return Date.now() >= geminiQuotaUntil;
}

async function getAudioContext(): Promise<AudioContext> {
  if (!sharedCtx) sharedCtx = new AudioContext();
  if (sharedCtx.state === "suspended") await sharedCtx.resume();
  return sharedCtx;
}

/** Call after user gesture (Start round) so coach audio can play on mobile */
export async function unlockCoachAudio(): Promise<void> {
  await getAudioContext();
}

async function fetchCoachAudio(
  text: string,
  attempt = 0
): Promise<ArrayBuffer | null> {
  if (!geminiAvailable()) return null;

  try {
    const res = await fetch("/api/coach-speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (res.status === 429 || res.status === 503) {
      geminiQuotaUntil = Date.now() + QUOTA_COOLDOWN_MS;
      coachVoiceReady = false;
      return null;
    }

    if (!res.ok) {
      if (attempt < FETCH_RETRIES) {
        await new Promise((r) => setTimeout(r, 280 * (attempt + 1)));
        return fetchCoachAudio(text, attempt + 1);
      }
      return null;
    }

    return res.arrayBuffer();
  } catch {
    if (attempt < FETCH_RETRIES) {
      await new Promise((r) => setTimeout(r, 280 * (attempt + 1)));
      return fetchCoachAudio(text, attempt + 1);
    }
    return null;
  }
}

async function playBuffer(
  buffer: ArrayBuffer,
  volume: number,
  hooks?: CoachSpeakHooks
): Promise<void> {
  const ctx = await getAudioContext();
  const decoded = await ctx.decodeAudioData(buffer.slice(0));

  stopActivePlayback();

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = decoded;
  source.playbackRate.value = COACH_PLAYBACK_RATE;
  gain.gain.value = Math.max(0, Math.min(1, volume));
  source.connect(gain);
  gain.connect(ctx.destination);
  activeSource = source;

  await new Promise<void>((resolve) => {
    source.onended = () => {
      if (activeSource === source) activeSource = null;
      hooks?.onEnd?.();
      resolve();
    };
    hooks?.onStart?.();
    source.start(0);
  });
}

function stopActivePlayback(): void {
  stopVoice();
  if (activeSource) {
    try {
      activeSource.stop();
    } catch {
      /* noop */
    }
    activeSource = null;
  }
}

async function speakWebFallback(
  text: string,
  volume: number,
  lang: AppLanguage,
  epoch: number,
  hooks?: CoachSpeakHooks
): Promise<boolean> {
  if (epoch !== voiceEpoch) return false;
  if (typeof window === "undefined" || !window.speechSynthesis) return false;

  stopActivePlayback();
  hooks?.onStart?.();
  await speakCoachCueAsync(text, volume, lang);
  if (epoch !== voiceEpoch) return false;
  hooks?.onEnd?.();
  return true;
}

/** Stop current line + clear queue (session exit). */
export function cancelCoachVoice(): void {
  voiceEpoch += 1;
  speakChain = Promise.resolve();
  stopActivePlayback();
}

/** Stop what's playing now but keep the queue — used before the next signal. */
export function interruptCoachPlayback(): void {
  voiceEpoch += 1;
  stopActivePlayback();
}

export async function initCoachVoice(lang: AppLanguage = "en"): Promise<boolean> {
  if (coachVoiceReady === true) return true;
  if (!geminiAvailable()) return false;

  await unlockCoachAudio();

  const buf = await fetchCoachAudio("Ready");
  coachVoiceReady = !!buf;
  if (buf) {
    audioCache.set(cacheKey("Ready", lang), buf);
  }
  return coachVoiceReady;
}

export function isCoachVoiceReady(): boolean {
  return coachVoiceReady === true && geminiAvailable();
}

async function speakOneLine(
  text: string,
  volume: number,
  lang: AppLanguage,
  epoch: number,
  hooks?: CoachSpeakHooks
): Promise<void> {
  if (epoch !== voiceEpoch) return;

  const trimmed = text.trim();
  if (!trimmed) return;

  let usedGemini = false;

  if (geminiAvailable()) {
    if (coachVoiceReady !== true) {
      await initCoachVoice(lang);
    }

    if (coachVoiceReady === true && epoch === voiceEpoch) {
      const key = cacheKey(trimmed, lang);
      let buffer = audioCache.get(key);

      if (!buffer) {
        buffer = (await fetchCoachAudio(trimmed)) ?? undefined;
        if (epoch !== voiceEpoch) return;
        if (buffer) audioCache.set(key, buffer);
      }

      if (buffer && epoch === voiceEpoch) {
        try {
          await playBuffer(buffer, volume, hooks);
          usedGemini = true;
        } catch {
          usedGemini = false;
        }
      }
    }
  }

  if (!usedGemini && epoch === voiceEpoch) {
    await speakWebFallback(trimmed, volume, lang, epoch, hooks);
  }
}

/** Queued coach speech — one line at a time. */
export function speakCoachLine(
  text: string,
  volume = 0.9,
  lang: AppLanguage = "en",
  hooks?: CoachSpeakHooks
): void {
  const epoch = voiceEpoch;
  speakChain = speakChain
    .then(async () => {
      await speakOneLine(text, volume, lang, epoch, hooks);
    })
    .catch(() => {});
}

export async function prefetchCoachLines(
  lines: string[],
  lang: AppLanguage = "en"
): Promise<void> {
  if (!geminiAvailable()) return;
  if (coachVoiceReady !== true) {
    await initCoachVoice(lang);
  }
  if (coachVoiceReady !== true) return;

  const unique = [...new Set(lines.map((l) => l.trim()).filter(Boolean))].slice(
    0,
    40
  );
  await Promise.all(
    unique.map(async (line) => {
      const key = cacheKey(line, lang);
      if (audioCache.has(key)) return;
      const buf = await fetchCoachAudio(line);
      if (buf) audioCache.set(key, buf);
    })
  );
}

export function resetCoachVoiceCache(): void {
  audioCache.clear();
  coachVoiceReady = null;
  geminiQuotaUntil = 0;
  speakChain = Promise.resolve();
}

export function stopCoachVoice(): void {
  cancelCoachVoice();
}
