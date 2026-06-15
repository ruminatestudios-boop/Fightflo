/** Matches `basePath` in next.config — used for fetch() and public asset URLs. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function runtimeBasePath(): string {
  if (BASE_PATH) return BASE_PATH;
  if (typeof window === "undefined") return "";
  const { pathname } = window.location;
  if (pathname === "/feedback" || pathname.startsWith("/feedback/")) {
    return "/feedback";
  }
  return "";
}

export function withBasePath(path: string): string {
  const base = runtimeBasePath() || BASE_PATH;
  if (!path.startsWith("/")) return path;
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}

export function apiPath(path: string): string {
  const relative = withBasePath(path.startsWith("/") ? path : `/${path}`);
  if (typeof window !== "undefined") {
    return new URL(relative, window.location.origin).href;
  }
  return relative;
}

export function reportPath(sessionId: string, mode?: "guard"): string {
  const query = mode === "guard" ? "?mode=guard" : "";
  // Next.js router/link apply basePath automatically — do not prepend BASE_PATH here.
  return `/report/${sessionId}${query}`;
}

export function absoluteReportUrl(sessionId: string, mode?: "guard"): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/feedback\/?$/, "") ??
        "https://fightflo.app";
  const query = mode === "guard" ? "?mode=guard" : "";
  return `${base}${withBasePath(`/report/${sessionId}`)}${query}`;
}
