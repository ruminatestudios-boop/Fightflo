/** One punchy line for the main training focal point */
export function shortCoachLine(text: string, maxWords = 6): string {
  const primary = text.split(/\s*[—–-]\s*/)[0]?.trim() ?? text.trim();
  const words = primary.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return primary;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/** Split long coach copy into readable chunks (secondary line optional) */
export function coachDisplayChunks(text: string): { primary: string; secondary?: string } {
  const parts = text
    .split(/\s*[—–-]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return { primary: shortCoachLine(text, 8) };
  }
  return {
    primary: shortCoachLine(parts[0], 6),
    secondary: parts.slice(1).join(" · "),
  };
}

/** Rhythm preview → pill labels */
export function rhythmPreviewPills(preview: string): string[] {
  return preview
    .split(/\s*→\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}
