/**
 * Loops.so email integration
 * @see https://loops.so/docs/api-reference
 */

import type { SkillLevel, SportId } from "@/types";

const LOOPS_API = "https://app.loops.so/api/v1";

export interface LoopsResult {
  ok: boolean;
  skipped?: boolean;
  duplicate?: boolean;
}

function getApiKey(): string | null {
  return process.env.LOOPS_API_KEY?.trim() || null;
}

function transactionalId(envKey: string, fallback: string): string {
  return process.env[envKey]?.trim() || fallback;
}

async function loopsFetch(
  path: string,
  body: Record<string, unknown>
): Promise<LoopsResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, skipped: true };

  try {
    const res = await fetch(`${LOOPS_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) return { ok: true };

    const text = await res.text();
    if (res.status === 409 || /already exists|duplicate/i.test(text)) {
      return { ok: true, duplicate: true };
    }

    console.error("[loops]", path, res.status, text);
    return { ok: false };
  } catch (error) {
    console.error("[loops]", path, error);
    return { ok: false };
  }
}

export async function createFeedbackContact(input: {
  email: string;
  userId: string;
  sport: SportId;
  level: SkillLevel;
}): Promise<LoopsResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false };

  return loopsFetch("/contacts/create", {
    email,
    userId: input.userId,
    source: "feedback_app",
    userGroup: "feedback",
    sport: input.sport,
    level: input.level,
    subscribed: true,
    mailingLists: {},
  });
}

export async function updateFeedbackContact(input: {
  email: string;
  properties: Record<string, string | number | boolean>;
}): Promise<LoopsResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false };

  return loopsFetch("/contacts/update", {
    email,
    ...input.properties,
  });
}

async function sendTransactional(input: {
  envKey: string;
  fallbackId: string;
  email: string;
  dataVariables: Record<string, string | number>;
}): Promise<LoopsResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false };

  return loopsFetch("/transactional", {
    transactionalId: transactionalId(input.envKey, input.fallbackId),
    email,
    dataVariables: input.dataVariables,
  });
}

export async function sendAnalysisReadyEmail(input: {
  email: string;
  reportUrl: string;
  mainFinding: string;
  sport: string;
}): Promise<LoopsResult> {
  return sendTransactional({
    envKey: "LOOPS_TX_ANALYSIS_READY",
    fallbackId: "analysis_ready",
    email: input.email,
    dataVariables: {
      reportUrl: input.reportUrl,
      mainFinding: input.mainFinding,
      sport: input.sport,
    },
  });
}

export async function sendWeeklyProgressEmail(input: {
  email: string;
  sessionsThisWeek: number;
  weaknessTrend: string;
}): Promise<LoopsResult> {
  return sendTransactional({
    envKey: "LOOPS_TX_WEEKLY_PROGRESS",
    fallbackId: "weekly_progress",
    email: input.email,
    dataVariables: {
      sessionsThisWeek: input.sessionsThisWeek,
      weaknessTrend: input.weaknessTrend,
    },
  });
}

export async function sendUpgradePromptEmail(input: {
  email: string;
  mainFinding: string;
  uploadUrl: string;
}): Promise<LoopsResult> {
  return sendTransactional({
    envKey: "LOOPS_TX_UPGRADE_PROMPT",
    fallbackId: "upgrade_prompt",
    email: input.email,
    dataVariables: {
      mainFinding: input.mainFinding,
      uploadUrl: input.uploadUrl,
    },
  });
}

export async function sendComebackEmail(input: {
  email: string;
  weakness: string;
  uploadUrl: string;
}): Promise<LoopsResult> {
  return sendTransactional({
    envKey: "LOOPS_TX_COMEBACK",
    fallbackId: "comeback",
    email: input.email,
    dataVariables: {
      weakness: input.weakness,
      uploadUrl: input.uploadUrl,
    },
  });
}
