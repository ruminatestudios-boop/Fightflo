"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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

async function compressImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function patchSession(
  sessionId: string,
  userId: string,
  patch: { display_name?: string | null; thumbnail_url?: string | null }
) {
  const res = await fetch(apiPath(`/api/sessions/${sessionId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...patch }),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Save failed");
}

interface SessionThumbnailProps {
  session: SessionLibraryEntry;
  localThumb: string | null;
  onUpload: (file: File) => void;
}

function SessionThumbnail({ session, localThumb, onUpload }: SessionThumbnailProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const src = localThumb
    ?? (session.thumbnail_url?.startsWith("data:") || session.thumbnail_url?.startsWith("http")
      ? session.thumbnail_url
      : session.resolved_thumbnail) ?? null;

  const preset = !src && isPresetThumbnail(session.thumbnail_url ?? "")
    ? presetEmoji(session.thumbnail_url ?? "")
    : null;

  return (
    <button
      type="button"
      className="session-library-thumb-btn"
      aria-label="Change thumbnail"
      onClick={() => fileRef.current?.click()}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="session-library-thumb" loading="lazy" />
      ) : (
        <span className="session-library-thumb session-library-thumb--preset">
          {preset ?? "🎬"}
        </span>
      )}
      <span className="session-library-thumb-overlay" aria-hidden>
        <svg viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
          <path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-1-1H7.586l-1 1H4z" />
          <circle cx="10" cy="11" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

interface SessionLibraryRowProps {
  session: SessionLibraryEntry;
  isPro: boolean;
  onUpgrade: () => void;
  onDeleted: () => void;
}

export function SessionLibraryRow({
  session,
  isPro,
  onUpgrade,
  onDeleted,
}: SessionLibraryRowProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressUpdate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(session.resolved_title);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [localThumb, setLocalThumb] = useState<string | null>(null);

  const statusClass = `session-library-status--${session.status}`;

  const displayName = savedName ?? session.resolved_title;

  const commitName = async () => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === displayName) {
      setNameDraft(displayName);
      return;
    }
    const userId = getStoredUserId();
    if (!userId) return;
    try {
      await patchSession(session.id, userId, { display_name: trimmed });
      setSavedName(trimmed);
    } catch {
      setNameDraft(displayName);
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    const userId = getStoredUserId();
    if (!userId) return;
    try {
      const dataUrl = await compressImageFile(file);
      setLocalThumb(dataUrl);
      await patchSession(session.id, userId, { thumbnail_url: dataUrl });
    } catch {
      setLocalThumb(null);
    }
  };

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
    const confirmed = window.confirm(`Delete "${displayName}"? This cannot be undone.`);
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
        <SessionThumbnail
          session={session}
          localThumb={localThumb}
          onUpload={(f) => void handleThumbnailUpload(f)}
        />
        <span className="session-library-body">
          <span className="session-library-row">
            {editingName ? (
              <input
                className="session-library-name-input"
                value={nameDraft}
                autoFocus
                maxLength={80}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => void commitName()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void commitName(); }
                  if (e.key === "Escape") { setEditingName(false); setNameDraft(displayName); }
                }}
                onClick={(e) => e.preventDefault()}
              />
            ) : (
              <span
                className="session-library-name"
                onClick={(e) => {
                  e.preventDefault();
                  setNameDraft(displayName);
                  setEditingName(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setNameDraft(displayName);
                    setEditingName(true);
                  }
                }}
              >
                {displayName}
              </span>
            )}
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
              : isPro ? "Download video" : "Upgrade to download video"
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
          className="session-library-delete"
          aria-label={`Delete ${displayName}`}
          disabled={deleting}
          onClick={(e) => void handleDelete(e)}
        >
          {deleting ? (
            <span className="session-library-download-spinner" aria-hidden />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </li>
  );
}
