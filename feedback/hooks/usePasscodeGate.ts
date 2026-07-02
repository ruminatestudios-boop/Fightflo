"use client";

import { useCallback, useEffect, useState } from "react";

const SECRET_KEY = "tasks_api_secret";

export function getTasksApiSecret(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SECRET_KEY);
}

export function usePasscodeGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR; read it post-mount to avoid a hydration mismatch.
    setUnlocked(Boolean(localStorage.getItem(SECRET_KEY)));
    setChecked(true);
  }, []);

  const submit = useCallback(async (passcode: string) => {
    const res = await fetch("/api/tasks-passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json()) as { ok: boolean; secret?: string; error?: string };

    if (data.error === "not_configured") {
      return { ok: false, message: "Not set up yet — missing passcode/secret config." };
    }
    if (data.ok && data.secret) {
      localStorage.setItem(SECRET_KEY, data.secret);
      setUnlocked(true);
      return { ok: true };
    }
    return { ok: false, message: "Incorrect passcode" };
  }, []);

  return { unlocked, checked, submit };
}
