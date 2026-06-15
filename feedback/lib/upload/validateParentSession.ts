import { getReportBySessionId, getSessionById } from "@/lib/db/queries";

export async function validateParentSession(
  parentSessionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parent = await getSessionById(parentSessionId);
  if (!parent) {
    return { ok: false, error: "Previous session not found." };
  }
  if (parent.user_id && parent.user_id !== userId) {
    return { ok: false, error: "That session does not belong to you." };
  }
  if (parent.status !== "complete") {
    return { ok: false, error: "Previous session is not finished analysing yet." };
  }

  const parentReport = await getReportBySessionId(parentSessionId);
  if (!parentReport) {
    return { ok: false, error: "Previous session has no report to compare against." };
  }

  return { ok: true };
}
