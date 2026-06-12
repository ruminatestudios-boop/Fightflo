import { GoogleGenAI } from "@google/genai";
import type {
  DifficultyMode,
  FightStyle,
  RhythmArchetype,
  RhythmMode,
  RhythmSegment,
} from "@/lib/types";
import {
  assemblePlan,
  buildOpponentSession,
  buildRhythmBlueprint,
  type FighterIntel,
  type OpponentSessionPlan,
} from "@/lib/opponent-planner";
import { getFighterRhythmScript } from "@/lib/fighter-profiles";
import { hashSeed } from "@/lib/fight-patterns";

const STYLES: FightStyle[] = ["muay-thai", "boxing", "mma", "kickboxing"];
const MODES: DifficultyMode[] = ["easy", "hard", "stadium"];
const ARCHETYPES: RhythmArchetype[] = [
  "muay-femur",
  "muay-mat",
  "muay-khao",
  "counter-fighter",
  "dutch-kickboxer",
  "mma",
];
const RHYTHM_MODES: RhythmMode[] = [
  "default",
  "five-round-war",
  "last-round-pressure",
  "stadium-pace",
  "counter-sniper",
  "pressure-nightmare",
  "technical-femur",
  "cardio-hell",
];
const SEGMENTS: RhythmSegment[] = [
  "reading",
  "probing",
  "pressure",
  "explosive",
  "counter",
  "defensive",
  "reset",
  "grind",
  "feint",
];

const GEMINI_MODEL = "gemini-2.5-flash";

function pickEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function sanitizeSegments(raw: unknown): RhythmSegment[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const filtered = raw.filter(
    (s): s is RhythmSegment =>
      typeof s === "string" && SEGMENTS.includes(s as RhythmSegment)
  );
  return filtered.length >= 4 ? filtered : undefined;
}

function sanitizeStringArray(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim().slice(0, 160))
    .slice(0, max);
}

function sanitizeIntel(raw: unknown, fallback: FighterIntel): FighterIntel {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  return {
    tendencies: sanitizeStringArray(o.tendencies, 4).length
      ? sanitizeStringArray(o.tendencies, 4)
      : fallback.tendencies,
    pacing:
      typeof o.pacing === "string" && o.pacing.trim()
        ? o.pacing.trim().slice(0, 200)
        : fallback.pacing,
    weapons: sanitizeStringArray(o.weapons, 4).length
      ? sanitizeStringArray(o.weapons, 4)
      : fallback.weapons,
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Invalid JSON");
  }
}

interface GeminiPlanPayload {
  displayName?: string;
  styleSummary?: string;
  intel?: {
    tendencies?: string[];
    pacing?: string;
    weapons?: string[];
  };
  lowActivityCoaching?: string[];
  gameplan?: string[];
  sessionCoachCues?: string[];
  restCue?: string;
  segmentScript?: string[];
  session?: {
    style?: string;
    mode?: string;
    workoutMode?: string;
    rhythmArchetype?: string;
    rhythmMode?: string;
    rounds?: { rounds?: number; roundLength?: number; restTime?: number };
  };
}

export function parseGeminiPlan(
  query: string,
  raw: GeminiPlanPayload
): OpponentSessionPlan {
  const local = buildOpponentSession(query);
  const sessionIn = raw.session ?? {};

  const style = pickEnum(sessionIn.style, STYLES, local.session.style);
  const mode = pickEnum(sessionIn.mode, MODES, local.session.mode);
  const rhythmArchetype = pickEnum(
    sessionIn.rhythmArchetype,
    ARCHETYPES,
    local.session.rhythmArchetype
  );
  const rhythmMode = pickEnum(
    sessionIn.rhythmMode,
    RHYTHM_MODES,
    local.session.rhythmMode
  );

  const rounds = Math.min(5, Math.max(1, sessionIn.rounds?.rounds ?? 3));
  const roundLength = Math.min(
    300,
    Math.max(60, sessionIn.rounds?.roundLength ?? 180)
  );
  const restTime = Math.min(120, Math.max(15, sessionIn.rounds?.restTime ?? 60));

  const displayName =
    typeof raw.displayName === "string" && raw.displayName.trim()
      ? raw.displayName.trim().slice(0, 80)
      : query.trim();

  const customScript =
    sanitizeSegments(raw.segmentScript) ??
    getFighterRhythmScript(local.displayName) ??
    getFighterRhythmScript(displayName);

  const gameplan = sanitizeStringArray(raw.gameplan, 5).length
    ? sanitizeStringArray(raw.gameplan, 5)
    : local.gameplan;

  return assemblePlan({
    displayName,
    matchedPreset: local.matchedPreset,
    planSource: "gemini",
    styleSummary:
      typeof raw.styleSummary === "string" && raw.styleSummary.trim()
        ? raw.styleSummary.trim().slice(0, 280)
        : local.styleSummary,
    intel: sanitizeIntel(raw.intel, local.intel),
    lowActivityCoaching: sanitizeStringArray(raw.lowActivityCoaching, 6).length
      ? sanitizeStringArray(raw.lowActivityCoaching, 6)
      : local.lowActivityCoaching,
    gameplan,
    sessionCoachCues: sanitizeStringArray(raw.sessionCoachCues, 8).length
      ? sanitizeStringArray(raw.sessionCoachCues, 8)
      : local.sessionCoachCues,
    restCue:
      typeof raw.restCue === "string" && raw.restCue.trim()
        ? raw.restCue.trim().slice(0, 200)
        : local.restCue,
    rhythmBlueprint: buildRhythmBlueprint(
      rhythmArchetype,
      rhythmMode,
      `${displayName}-${hashSeed(query)}`,
      customScript,
      true
    ),
    session: {
      style,
      mode,
      workoutMode: "solo",
      rhythmArchetype,
      rhythmMode,
      rounds: { rounds, roundLength, restTime },
    },
  });
}

export async function generateGeminiOpponentPlan(
  query: string
): Promise<OpponentSessionPlan | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an elite fight coach preparing a fighter to face "${query}".

Use Google Search to research REAL fight footage, tendencies, weapons, and how their rounds actually flow — not generic fitness advice.

Return ONLY valid JSON (no markdown) with:
- displayName, styleSummary (one sentence)
- intel: { tendencies: 3 specific habits from their fights, pacing: one sentence on round rhythm, weapons: 2-4 signature tools }
- lowActivityCoaching: 4-6 SHORT lines for quiet feel-out moments (what to DO — feint, probe, circle; under 10 words)
- gameplan: 3 bullets for solo training focus vs this fighter
- sessionCoachCues: 6 in-round corner lines (gym talk, under 10 words)
- restCue: between rounds
- segmentScript: 10-12 values ONLY from [${SEGMENTS.join(", ")}] in order that mimics THEIR real round pacing
- session: { style, mode, rhythmArchetype, rhythmMode, rounds: { rounds, roundLength, restTime } }

Unofficial training simulation only.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) return null;

    const parsed = extractJson(text) as GeminiPlanPayload;
    return parseGeminiPlan(query, parsed);
  } catch {
    return null;
  }
}
