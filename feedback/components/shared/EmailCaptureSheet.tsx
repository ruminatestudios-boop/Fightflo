"use client";

import { useState } from "react";
import { getStoredUserId } from "@/lib/storage/client";
import { apiPath } from "@/lib/paths";

interface EmailCaptureSheetProps {
  open: boolean;
  onClose: () => void;
  sport?: string;
}

export function EmailCaptureSheet({ open, onClose, sport }: EmailCaptureSheetProps) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }

    const userId = getStoredUserId();
    if (!userId) { onClose(); return; }

    setSaving(true);
    setError(null);
    try {
      await fetch(apiPath("/api/user/email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: trimmed, sport }),
      });
    } catch {
      // non-blocking — close regardless
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="email-capture-backdrop" onClick={onClose}>
      <div className="email-capture-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="email-capture-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="email-capture-title">Save your results</h2>
        <p className="email-capture-body">
          Get your coaching report in your inbox and track your progress over time.
        </p>
        <form className="email-capture-form" onSubmit={(e) => void handleSubmit(e)}>
          <input
            className="email-capture-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="email"
          />
          {error && <p className="email-capture-error">{error}</p>}
          <button type="submit" className="email-capture-submit" disabled={saving}>
            {saving ? "Saving…" : "Send me my results"}
          </button>
        </form>
        <button type="button" className="email-capture-skip" onClick={onClose}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
