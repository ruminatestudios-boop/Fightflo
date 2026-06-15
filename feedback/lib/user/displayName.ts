/** First name from email local part, e.g. pritesh.kumar@… → Pritesh */
export function displayNameFromEmail(
  email: string | null | undefined
): string | null {
  if (!email?.trim()) return null;

  const local = email.trim().split("@")[0] ?? "";
  const segment = local.split(/[._+\-]/)[0]?.trim();
  if (!segment || segment.length < 2) return null;

  return formatDisplayName(segment);
}

export function formatDisplayName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
