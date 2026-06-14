"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { getStoredUserId } from "@/lib/storage/client";
import { apiPath } from "@/lib/paths";
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

const SWIPE_OPEN = -96;
const SWIPE_THRESHOLD = 56;

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
  const [offset, setOffset] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragRef = useRef({ startX: 0, startOffset: 0 });
  const offsetRef = useRef(0);

  const updateOffset = useCallback((next: number) => {
    offsetRef.current = next;
    setOffset(next);
  }, []);

  const statusClass = `session-library-status--${session.status}`;

  const resetSwipe = useCallback(() => {
    updateOffset(0);
    setConfirming(false);
  }, [updateOffset]);

  const snapSwipe = useCallback(
    (currentOffset: number) => {
      if (currentOffset <= -SWIPE_THRESHOLD) {
        updateOffset(SWIPE_OPEN);
        setConfirming(true);
        return;
      }
      resetSwipe();
    },
    [resetSwipe, updateOffset]
  );

  const handlePointerDown = (clientX: number) => {
    dragRef.current = { startX: clientX, startOffset: offsetRef.current };
    setDragging(true);
  };

  const handlePointerMove = (clientX: number) => {
    if (!dragging) return;
    const dx = clientX - dragRef.current.startX;
    const next = Math.min(0, Math.max(-120, dragRef.current.startOffset + dx));
    updateOffset(next);
  };

  const handlePointerEnd = () => {
    if (!dragging) return;
    setDragging(false);
    snapSwipe(offsetRef.current);
  };

  const handleDownload = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isPro) {
      onUpgrade();
      return;
    }

    const userId = session.user_id ?? getStoredUserId();
    if (!userId) return;

    setDownloading(true);
    try {
      const res = await fetch(
        apiPath(`/api/video/download?sessionId=${session.id}&userId=${userId}`)
      );
      if (res.status === 402) {
        onUpgrade();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-${session.id.slice(0, 8)}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
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
      resetSwipe();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li
      className={`session-library-swipe${offset < -8 || confirming ? " session-library-swipe--open" : ""}`}
    >
      <div className="session-library-swipe-back" aria-hidden={!confirming && offset >= -8}>
        {confirming ? (
          <>
            <button
              type="button"
              className="session-library-swipe-keep"
              onClick={resetSwipe}
              disabled={deleting}
            >
              Keep
            </button>
            <button
              type="button"
              className="session-library-swipe-delete"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        ) : offset < -20 ? (
          <span className="session-library-swipe-hint">Delete</span>
        ) : null}
      </div>

      <div
        className={`session-library-swipe-front${dragging ? " session-library-swipe-front--dragging" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={handlePointerEnd}
        onTouchCancel={handlePointerEnd}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button, a")) return;
          handlePointerDown(e.clientX);
        }}
        onMouseMove={(e) => {
          if (e.buttons !== 1) return;
          handlePointerMove(e.clientX);
        }}
        onMouseUp={handlePointerEnd}
        onMouseLeave={() => {
          if (dragging) handlePointerEnd();
        }}
      >
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
          className={`session-library-download${isPro ? "" : " session-library-download--locked"}`}
          aria-label={isPro ? "Download video" : "Upgrade to download video"}
          disabled={downloading}
          onClick={(e) => void handleDownload(e)}
        >
          {downloading ? (
            <span className="session-library-download-spinner" aria-hidden />
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
      </div>
    </li>
  );
}
