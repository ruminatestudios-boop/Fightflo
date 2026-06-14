export const ACCENT = "#ff9500";

export const ACCENT_MUTED = "rgba(255, 149, 0, 0.15)";

export function chipClass(selected: boolean): string {
  return selected
    ? "ring-2 ring-[#ff9500]/70 ring-offset-2 ring-offset-black"
    : "opacity-80 hover:opacity-100";
}
