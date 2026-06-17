"use client";

import { useState } from "react";
import { SessionEditSheet } from "@/components/netflix/SessionEditSheet";
import { SessionLibraryRow } from "@/components/netflix/SessionLibraryRow";
import type { SessionLibraryEntry } from "@/lib/sessions/library";

interface SessionLibraryProps {
  sessions: SessionLibraryEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export function SessionLibrary({
  sessions,
  loading,
  error,
  onRetry,
  isPro = false,
  onUpgrade,
}: SessionLibraryProps) {
  const [editing, setEditing] = useState<SessionLibraryEntry | null>(null);

  if (loading) {
    return (
      <div
        className="session-library session-library--empty"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="session-library-loading-wheel" aria-hidden />
        <p className="session-library-hint">Loading your sessions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="session-library session-library--empty">
        <p className="session-library-hint">{error}</p>
        <button type="button" className="session-library-retry" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="session-library session-library--empty">
        <p className="session-library-title">No sessions yet</p>
        <p className="session-library-hint">
          Upload a training clip and your coaching reports will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="session-library">
        <p className="session-library-count">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </p>
        <ul className="session-library-list">
          {sessions.map((session) => (
            <SessionLibraryRow
              key={session.id}
              session={session}
              isPro={isPro}
              onEdit={() => setEditing(session)}
              onUpgrade={() => onUpgrade?.()}
              onDeleted={onRetry}
            />
          ))}
        </ul>
      </div>

      <SessionEditSheet
        session={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={onRetry}
      />
    </>
  );
}
