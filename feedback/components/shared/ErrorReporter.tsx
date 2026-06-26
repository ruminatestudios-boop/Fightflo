"use client";

import { useEffect } from "react";

export function reportClientError(
  message: string,
  options?: { stack?: string; context?: string }
): void {
  if (typeof window === "undefined") return;
  const userId = localStorage.getItem("feedback_anon_user_id");

  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      stack: options?.stack,
      context: options?.context,
      url: window.location.href,
      userId,
    }),
  }).catch(() => undefined);
}

/** Mounted once in the root layout — catches uncaught errors app-wide */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Generic placeholder the browser substitutes for cross-origin script
      // errors with no CORS headers — carries zero diagnostic info, not
      // actionable, and floods the log with noise.
      if (event.message === "Script error." && !event.error?.stack) return;

      reportClientError(event.message || "Uncaught error", {
        stack: event.error?.stack,
        context: "window.onerror",
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection");

      // User-initiated cancellations (share sheet dismissed, fetch aborted)
      // aren't real errors — same filtering useUpload.ts already applies.
      const isBenignAbort =
        (reason instanceof Error && reason.name === "AbortError") ||
        message.toLowerCase().includes("abort") ||
        message.toLowerCase().includes("cancellation of share");
      if (isBenignAbort) return;

      reportClientError(message, {
        stack: reason instanceof Error ? reason.stack : undefined,
        context: "unhandledrejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
