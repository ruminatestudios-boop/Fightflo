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
      reportClientError(event.message || "Uncaught error", {
        stack: event.error?.stack,
        context: "window.onerror",
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection");
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
