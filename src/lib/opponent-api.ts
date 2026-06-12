import {
  buildOpponentSession,
  type OpponentSessionPlan,
} from "./opponent-planner";

export async function fetchOpponentPlan(
  query: string
): Promise<OpponentSessionPlan> {
  const trimmed = query.trim();
  if (!trimmed) return buildOpponentSession("");

  try {
    const res = await fetch("/api/opponent-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
    });
    if (!res.ok) return buildOpponentSession(trimmed);
    return (await res.json()) as OpponentSessionPlan;
  } catch {
    return buildOpponentSession(trimmed);
  }
}
