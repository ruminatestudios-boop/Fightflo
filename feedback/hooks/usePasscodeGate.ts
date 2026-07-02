"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tasks_pin_ok";

export function usePasscodeGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR; read it post-mount to avoid a hydration mismatch.
    setUnlocked(localStorage.getItem(STORAGE_KEY) === "true");
    setChecked(true);
  }, []);

  const submit = useCallback(async (passcode: string) => {
    const res = await fetch("/api/tasks-passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json()) as { ok: boolean };
    if (data.ok) {
      localStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
    }
    return data.ok;
  }, []);

  return { unlocked, checked, submit };
}
