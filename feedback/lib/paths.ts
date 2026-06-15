/** Matches `basePath` in next.config — used for fetch() and public asset URLs. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  if (!BASE_PATH) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

export function apiPath(path: string): string {
  return withBasePath(path.startsWith("/") ? path : `/${path}`);
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
