/** First name from email local part, e.g. pritesh.kumar@… → Pritesh */
export function displayNameFromEmail(
  email: string | null | undefined
): string | null {
  if (!email?.trim()) return null;

  const local = email.trim().split("@")[0] ?? "";
  const segment = local.split(/[._+\-]/)[0]?.trim();
  if (!segment || segment.length < 2) return null;

  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}
