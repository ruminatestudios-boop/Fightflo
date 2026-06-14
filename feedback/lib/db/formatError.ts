export function formatDbError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.details === "string") return record.details;
    if (typeof record.hint === "string") return record.hint;
  }
  return "Something went wrong";
}
