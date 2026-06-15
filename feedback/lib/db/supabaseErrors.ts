/** True when PostgREST/Postgres rejects an unknown column (older prod schemas). */
export function isMissingColumnError(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    msg.includes("could not find") ||
    msg.includes("schema cache")
  );
}

export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return "Database error";
  const record = error as { message?: string; details?: string; hint?: string };
  return record.message ?? record.details ?? "Database error";
}
