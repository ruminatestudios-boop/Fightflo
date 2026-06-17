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

/** `.single()` / `.maybeSingle()` when 0 or 2+ rows match */
export function isPostgrestRowCountError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: string; message?: string };
  const msg = (record.message ?? "").toLowerCase();
  return (
    record.code === "PGRST116" ||
    msg.includes("multiple (or no) rows")
  );
}

export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return "Database error";
  const record = error as { message?: string; details?: string; hint?: string };
  return record.message ?? record.details ?? "Database error";
}
