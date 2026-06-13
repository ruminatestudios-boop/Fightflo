export type ComingSoonInterest = "muaythai" | "kickboxing";

export const COMING_SOON_INTERESTS: ComingSoonInterest[] = [
  "muaythai",
  "kickboxing",
];

export function isComingSoonInterest(value: string): value is ComingSoonInterest {
  return value === "muaythai" || value === "kickboxing";
}

export function normalizeComingSoonInterests(
  values: unknown
): ComingSoonInterest[] | null {
  if (!Array.isArray(values)) return null;
  const unique = new Set<ComingSoonInterest>();
  for (const value of values) {
    if (typeof value === "string" && isComingSoonInterest(value)) {
      unique.add(value);
    }
  }
  return unique.size > 0 ? [...unique] : null;
}

export function comingSoonUserGroup(
  interests: ComingSoonInterest[]
): string {
  const hasMuay = interests.includes("muaythai");
  const hasKick = interests.includes("kickboxing");
  if (hasMuay && hasKick) return "coming_soon_both";
  if (hasMuay) return "coming_soon_muaythai";
  return "coming_soon_kickboxing";
}
