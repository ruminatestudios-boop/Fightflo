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

export function reportPath(sessionId: string): string {
  return withBasePath(`/report/${sessionId}`);
}

export function absoluteReportUrl(sessionId: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/feedback\/?$/, "") ??
        "https://fightflo.app";
  return `${base}${reportPath(sessionId)}`;
}
