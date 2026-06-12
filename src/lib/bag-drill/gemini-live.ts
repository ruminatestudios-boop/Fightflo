import { GoogleGenAI, Modality } from "@google/genai";
import type { Session } from "@google/genai";
import { getDeviceId } from "@/lib/device-id";
import type { BagStance } from "./calibration";
import type { BagCameraMode, BagCombo, BagStrike } from "./types";
import {
  buildBagDetectionPrompt,
  buildComboValidateTurn,
  buildComboWatchTurn,
  buildFighterValidationPrompt,
  buildStrikeWatchTurn,
  parseStrikeResponse,
  type StrikeParseResult,
} from "./strike-validator";

const LIVE_MODEL = "gemini-2.0-flash-live-001";

export interface GeminiLiveConnection {
  session: Session;
  close: () => void;
  watchCombo: (combo: BagCombo) => void;
  watchStrike: (
    strike: BagStrike,
    stance: BagStance,
    index: number,
    total: number
  ) => void;
  validateCombo: (combo: BagCombo) => void;
}

export async function fetchLiveToken(
  cameraMode: BagCameraMode,
  stance: BagStance = "orthodox"
): Promise<string> {
  const deviceId = getDeviceId();
  if (!deviceId) {
    throw new Error("Pro subscription required for AI punch recognition");
  }

  const res = await fetch("/api/bag-drill/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cameraMode, deviceId, stance }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not get Live API token");
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

function extractTextFromMessage(msg: unknown): string {
  const m = msg as {
    text?: string;
    serverContent?: {
      modelTurn?: { parts?: { text?: string }[] };
      outputTranscription?: { text?: string };
    };
  };

  if (typeof m.text === "string") return m.text;

  const parts = m.serverContent?.modelTurn?.parts ?? [];
  const fromParts = parts.map((p) => p.text ?? "").join("");
  if (fromParts) return fromParts;

  return m.serverContent?.outputTranscription?.text ?? "";
}

export async function connectStrikeValidator(
  cameraMode: BagCameraMode,
  onResult: (result: StrikeParseResult) => void,
  onError?: (message: string) => void,
  onStatus?: (status: "connecting" | "connected" | "disconnected") => void,
  stance: BagStance = "orthodox"
): Promise<GeminiLiveConnection> {
  onStatus?.("connecting");

  const prompt =
    cameraMode === "fighter"
      ? buildFighterValidationPrompt(stance)
      : buildBagDetectionPrompt();

  let token: string;
  try {
    token = await fetchLiveToken(cameraMode, stance);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token fetch failed";
    onError?.(msg);
    throw e;
  }

  const ai = new GoogleGenAI({
    apiKey: token,
    httpOptions: { apiVersion: "v1alpha" },
  });

  let closed = false;
  let session: Session | null = null;

  session = await ai.live.connect({
    model: LIVE_MODEL,
    config: {
      responseModalities: [Modality.TEXT],
      systemInstruction: { parts: [{ text: prompt }] },
    },
    callbacks: {
      onopen: () => onStatus?.("connected"),
      onmessage: (message) => {
        const text = extractTextFromMessage(message);
        if (!text) return;
        const parsed = parseStrikeResponse(text);
        if (parsed) onResult(parsed);
      },
      onerror: (e) => {
        if (!closed) onError?.(e.message ?? "Live API error");
      },
      onclose: () => {
        if (!closed) onStatus?.("disconnected");
      },
    },
  });

  return {
    session,
    watchCombo: (combo: BagCombo) => {
      if (cameraMode !== "fighter" || !session) return;
      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: buildComboWatchTurn(combo) }] }],
        turnComplete: true,
      });
    },
    watchStrike: (strike, strikeStance, index, total) => {
      if (cameraMode !== "fighter" || !session) return;
      session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              { text: buildStrikeWatchTurn(strike, strikeStance, index, total) },
            ],
          },
        ],
        turnComplete: true,
      });
    },
    validateCombo: (combo: BagCombo) => {
      if (cameraMode !== "fighter" || !session) return;
      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: buildComboValidateTurn(combo) }] }],
        turnComplete: true,
      });
    },
    close: () => {
      closed = true;
      session?.close();
    },
  };
}

export function sendVideoFrame(session: Session, blob: globalThis.Blob): void {
  session.sendRealtimeInput({
    media: blob as unknown as Parameters<Session["sendRealtimeInput"]>[0]["media"],
  });
}

export function sendAudioChunk(session: Session, pcm: ArrayBuffer): void {
  const blob = new Blob([pcm], { type: "audio/pcm;rate=16000" });
  session.sendRealtimeInput({
    audio: blob as unknown as Parameters<Session["sendRealtimeInput"]>[0]["audio"],
  });
}
