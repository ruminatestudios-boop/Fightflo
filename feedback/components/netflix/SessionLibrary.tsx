"use client";

import { useState } from "react";
import Link from "next/link";
import { SessionEditSheet } from "@/components/netflix/SessionEditSheet";
import {
  isPresetThumbnail,
  presetEmoji,
  type SessionLibraryEntry,
} from "@/lib/sessions/library";
import type { SessionStatus } from "@/types";

const STATUS_LABEL: Record<SessionStatus, string> = {
  complete: "Ready",
  processing: "Analyzing",
  uploading: "Uploading",
  failed: "Failed",
};

interface SessionLibraryProps {
  sessions: SessionLibraryEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SessionThumbnail({ session }: { session: SessionLibraryEntry }) {
  const preset = isPresetThumbnail(session.thumbnail_url)
    ? presetEmoji(session.thumbnail_url)
    : null;

  if (preset) {
    return <span className="session-library-thumb session-library-thumb--preset">{preset}</span>;
  }

  const src =
    session.thumbnail_url?.startsWith("data:") || session.thumbnail_url?.startsWith("http")
      ? session.thumbnail_url
      : session.resolved_thumbnail;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="session-library-thumb" loading="lazy" />
    );
  }

  return <span className="session-library-thumb session-library-thumb--preset">🎬</span>;
}

export function SessionLibrary({
  sessions,
  loading,
  error,
  onRetry,
}: SessionLibraryProps) {
  const [editing, setEditing] = useState<SessionLibraryEntry | null>(null);

  if (loading) {
    return (
      <div className="session-library session-library--empty">
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
          {sessions.map((session) => {
            const statusClass = `session-library-status--${session.status}`;

            return (
              <li key={session.id} className="session-library-row-wrap">
                <Link href={`/report/${session.id}`} className="session-library-item">
                  <SessionThumbnail session={session} />
                  <span className="session-library-body">
                    <span className="session-library-row">
                      <span className="session-library-name">{session.resolved_title}</span>
                      <span className={`session-library-status ${statusClass}`}>
                        {STATUS_LABEL[session.status]}
                      </span>
                    </span>
                    <span className="session-library-desc">{session.resolved_summary}</span>
                    <span className="session-library-meta">
                      {formatSessionDate(session.created_at)} · {session.level}
                    </span>
                  </span>
                  <svg
                    className="session-library-chevron"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <button
                  type="button"
                  className="session-library-edit"
                  aria-label={`Edit ${session.resolved_title}`}
                  onClick={() => setEditing(session)}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </li>
            );
          })}
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
