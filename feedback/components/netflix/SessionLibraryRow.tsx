"use client";

import Link from "next/link";
import { useState } from "react";
import { getStoredUserId } from "@/lib/storage/client";
import { apiPath } from "@/lib/paths";
import {
  DownloadSessionVideoError,
  downloadSessionVideo,
  type DownloadProgressUpdate,
} from "@/lib/video/downloadSessionVideo";
import {
  DownloadProgressRing,
  formatDownloadTimeLeft,
} from "@/components/shared/DownloadProgressRing";
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
    return (
      <span className="session-library-thumb session-library-thumb--preset">{preset}</span>
    );
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

interface SessionLibraryRowProps {
  session: SessionLibraryEntry;
  isPro: boolean;
  onEdit: () => void;
  onUpgrade: () => void;
  onDeleted: () => void;
}

export function SessionLibraryRow({
  session,
  isPro,
  onEdit,
  onUpgrade,
  onDeleted,
}: SessionLibraryRowProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgressUpdate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const statusClass = `session-library-status--${session.status}`;

  const handleDownload = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const userId = session.user_id ?? getStoredUserId();
    if (!userId) return;

    setDownloading(true);
    setDownloadProgress(null);
    try {
      await downloadSessionVideo(session.id, userId, setDownloadProgress);
    } catch (err) {
      if (err instanceof DownloadSessionVideoError && err.code === "PRO_REQUIRED") {
        onUpgrade();
        return;
      }
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm(
      `Delete "${session.resolved_title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const userId = getStoredUserId();
    if (!userId) return;

    setDeleting(true);
    try {
      const res = await fetch(apiPath(`/api/sessions/${session.id}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li className="session-library-card">
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
      </Link>

      <div className="session-library-actions">
        <button
          type="button"
          className={`session-library-download${isPro ? "" : " session-library-download--locked"}`}
          aria-label={
            downloading && downloadProgress
              ? `${downloadProgress.message} — ${formatDownloadTimeLeft(downloadProgress.secondsRemaining)} left`
              : isPro
                ? "Download video"
                : "Upgrade to download video"
          }
          disabled={downloading}
          onClick={(e) => void handleDownload(e)}
        >
          {downloading && downloadProgress ? (
            <DownloadProgressRing percent={downloadProgress.percent} />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="session-library-edit"
          aria-label={`Edit ${session.resolved_title}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <button
          type="button"
          className="session-library-delete"
          aria-label={`Delete ${session.resolved_title}`}
          disabled={deleting}
          onClick={(e) => void handleDelete(e)}
        >
          {deleting ? (
            <span className="session-library-download-spinner" aria-hidden />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          )}
        </button>
      </div>
    </li>
  );
}
