import { isSupabaseConfigured } from "@/lib/config/env";
import { hydrateDevStore } from "@/lib/db/dev-store";
import { formatSupabaseError, isPostgrestRowCountError } from "@/lib/db/supabaseErrors";

let devFallbackActive = !isSupabaseConfigured();

/** Use in-memory dev store instead of Supabase */
export function isDevStoreActive(): boolean {
  if (devFallbackActive) hydrateDevStore();
  return devFallbackActive;
}

export function isConnectionError(error: unknown): boolean {
  const text = formatSupabaseError(error).toLowerCase();
  return (
    text.includes("fetch failed") ||
    text.includes("enotfound") ||
    text.includes("econnrefused") ||
    text.includes("network") ||
    text.includes("getaddrinfo")
  );
}

export function activateDevFallback(error: unknown): void {
  if (devFallbackActive) return;
  if (process.env.NODE_ENV !== "development") return;

  devFallbackActive = true;
  hydrateDevStore();
  console.warn(
    "[db] Supabase unreachable — using in-memory dev store for this dev server session.",
    formatSupabaseError(error)
  );
}

export function devFallbackUserMessage(error: unknown): string {
  if (isConnectionError(error)) {
    return "Can't reach the database — check Supabase in .env or restart without it for local dev mode.";
  }
  return formatSupabaseError(error);
}

/** On connection failure in dev, switch to in-memory store and retry once. */
export async function withDevFallback<T>(
  error: unknown,
  devRetry: () => Promise<T>
): Promise<T> {
  if (isConnectionError(error)) {
    activateDevFallback(error);
    return devRetry();
  }
  if (
    process.env.NODE_ENV === "development" &&
    isPostgrestRowCountError(error)
  ) {
    hydrateDevStore();
    return devRetry();
  }
  throw error instanceof Error ? error : new Error(formatSupabaseError(error));
}

let probePromise: Promise<void> | null = null;

/** Probe Supabase once in dev so parallel requests don't race before fallback activates. */
export function ensureDevDatabaseReady(): Promise<void> {
  if (isDevStoreActive()) return Promise.resolve();
  if (probePromise) return probePromise;

  probePromise = Promise.race([
    (async () => {
      if (process.env.NODE_ENV !== "development" || !isSupabaseConfigured()) return;

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return;

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await supabase.from("users").select("id").limit(1);
      if (error && isConnectionError(error)) {
        activateDevFallback(error);
      }
    })(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 2500);
    }),
  ]).catch((error) => {
    if (isConnectionError(error)) activateDevFallback(error);
  });

  return probePromise;
}

if (process.env.NODE_ENV === "development" && isSupabaseConfigured()) {
  void ensureDevDatabaseReady();
}
