"use client";

import { useState } from "react";
import { TransportButton } from "./TransportButton";
import { ArrowRightIcon } from "./icons";
import { usePasscodeGate } from "@/hooks/usePasscodeGate";

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const { unlocked, checked, submit } = usePasscodeGate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!checked) return null;
  if (unlocked) return <>{children}</>;

  async function handleSubmit() {
    const result = await submit(pin);
    if (!result.ok) {
      setError(result.message ?? "Incorrect passcode");
      setPin("");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="surface-card w-full max-w-xs p-6 flex flex-col gap-4 items-center">
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Enter passcode</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
          className="w-full h-12 rounded-full bg-[var(--surface-pill)] border border-[var(--border)] text-center text-lg tracking-widest text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-red)]"
        />
        {error && <p className="text-xs text-[var(--accent-red)]">{error}</p>}
        <TransportButton variant="active" onClick={handleSubmit} aria-label="Submit passcode">
          <ArrowRightIcon className="h-5 w-5" />
        </TransportButton>
      </div>
    </div>
  );
}
