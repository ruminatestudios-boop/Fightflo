/**
 * Loops.so email integration
 * @see https://loops.so/docs/api-reference
 */

const LOOPS_API = "https://app.loops.so/api/v1";

export async function sendAnalysisReadyEmail(input: {
  email: string;
  reportUrl: string;
  mainFinding: string;
  sport: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) return;

  await fetch(`${LOOPS_API}/transactional`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionalId: "analysis_ready",
      email: input.email,
      dataVariables: {
        reportUrl: input.reportUrl,
        mainFinding: input.mainFinding,
        sport: input.sport,
      },
    }),
  });
}

export async function sendWeeklyProgressEmail(input: {
  email: string;
  sessionsThisWeek: number;
  weaknessTrend: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) return;

  await fetch(`${LOOPS_API}/transactional`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionalId: "weekly_progress",
      email: input.email,
      dataVariables: input,
    }),
  });
}

export async function sendUpgradePromptEmail(input: {
  email: string;
  mainFinding: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) return;

  await fetch(`${LOOPS_API}/transactional`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionalId: "upgrade_prompt",
      email: input.email,
      dataVariables: input,
    }),
  });
}

export async function sendComebackEmail(input: {
  email: string;
  weakness: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) return;

  await fetch(`${LOOPS_API}/transactional`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionalId: "comeback",
      email: input.email,
      dataVariables: input,
    }),
  });
}
