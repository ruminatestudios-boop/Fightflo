"use client";

import { useCallback, useState } from "react";
import { getDeviceId } from "@/lib/device-id";
import { isValidEmail } from "@/lib/email/validate";
import {
  isComingSoonEmailCaptured,
  markComingSoonEmailCaptured,
} from "@/lib/bag-drill/coming-soon-storage";
import type { ComingSoonInterest } from "@/lib/bag-drill/coming-soon-interests";

export type ComingSoonCaptureStatus =
  | "idle"
  | "submitting"
  | "success"
  | "already"
  | "invalid"
  | "no_interest"
  | "error";

const DEFAULT_INTERESTS: ComingSoonInterest[] = ["muaythai", "kickboxing"];

export function useComingSoonCapture(initialEmail = "") {
  const [email, setEmail] = useState(initialEmail);
  const [interests, setInterests] =
    useState<ComingSoonInterest[]>(DEFAULT_INTERESTS);
  const [status, setStatus] = useState<ComingSoonCaptureStatus>(() =>
    isComingSoonEmailCaptured() ? "already" : "idle"
  );
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  const fetchWaitlistCount = useCallback(async () => {
    try {
      const res = await fetch("/api/bag/coming-soon");
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number") setWaitlistCount(data.count);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleInterest = useCallback((interest: ComingSoonInterest) => {
    setInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((item) => item !== interest);
      }
      return [...current, interest];
    });
    setStatus((current) =>
      current === "no_interest" || current === "invalid" ? "idle" : current
    );
  }, []);

  const submit = useCallback(async () => {
    if (isComingSoonEmailCaptured()) {
      setStatus("already");
      return false;
    }

    if (interests.length === 0) {
      setStatus("no_interest");
      return false;
    }

    if (!isValidEmail(email)) {
      setStatus("invalid");
      return false;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/bag/coming-soon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          deviceId: getDeviceId(),
          interestedIn: interests,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (data.error === "invalid_email") setStatus("invalid");
        else if (data.error === "no_interest") setStatus("no_interest");
        else setStatus("error");
        return false;
      }

      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number") setWaitlistCount(data.count);

      markComingSoonEmailCaptured(email);
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }, [email, interests]);

  return {
    email,
    setEmail,
    interests,
    toggleInterest,
    status,
    submit,
    waitlistCount,
    fetchWaitlistCount,
    alreadyCaptured: status === "already" || isComingSoonEmailCaptured(),
  };
}
