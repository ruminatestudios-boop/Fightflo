"use client";

import { useCallback, useState } from "react";
import { getDeviceId } from "@/lib/device-id";
import { isValidEmail } from "@/lib/email/validate";
import {
  isEmailCaptured,
  markEmailCaptured,
  type EmailCaptureSource,
} from "@/lib/boxing-timer/email-capture-storage";
import { loadTimerUpsellStats } from "@/lib/boxing-timer/upsell-storage";

export type EmailCaptureStatus =
  | "idle"
  | "submitting"
  | "success"
  | "already"
  | "invalid"
  | "error";

export function useTimerEmailCapture(initialEmail = "") {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<EmailCaptureStatus>(() =>
    isEmailCaptured() ? "already" : "idle"
  );

  const submit = useCallback(
    async (source: EmailCaptureSource) => {
      if (isEmailCaptured()) {
        setStatus("already");
        return false;
      }

      if (!isValidEmail(email)) {
        setStatus("invalid");
        return false;
      }

      setStatus("submitting");

      try {
        const res = await fetch("/api/timer/email-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            source,
            timerSessionsBeforeCapture:
              loadTimerUpsellStats().timerSessionsCompleted,
            deviceId: getDeviceId(),
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (data.error === "invalid_email") {
            setStatus("invalid");
          } else {
            setStatus("error");
          }
          return false;
        }

        markEmailCaptured(email);
        setStatus("success");
        return true;
      } catch {
        setStatus("error");
        return false;
      }
    },
    [email]
  );

  const resetError = useCallback(() => {
    if (status === "invalid" || status === "error") {
      setStatus("idle");
    }
  }, [status]);

  return {
    email,
    setEmail,
    status,
    submit,
    resetError,
    alreadyCaptured: status === "already" || isEmailCaptured(),
  };
}
