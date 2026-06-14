"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredUserId } from "@/lib/storage/client";
import { isPresetThumbnail, type SessionLibraryEntry } from "@/lib/sessions/library";

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

interface SessionEditSheetProps {
  session: SessionLibraryEntry | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SessionEditSheet({
  session,
  open,
  onClose,
  onSaved,
}: SessionEditSheetProps) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setName(session.display_name ?? session.resolved_title);
    setSummary(session.summary ?? session.resolved_summary);
    setThumbnailUrl(
      session.thumbnail_url && !isPresetThumbnail(session.thumbnail_url)
        ? session.thumbnail_url
        : null
    );
    setConfirmDelete(false);
    setError(null);
  }, [session]);

  const save = useCallback(async () => {
    if (!session) return;
    const userId = getStoredUserId();
    if (!userId) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          display_name: name.trim() || null,
          summary: summary.trim() || null,
          thumbnail_url: thumbnailUrl,
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [session, name, summary, thumbnailUrl, onClose, onSaved]);

  const remove = useCallback(async () => {
    if (!session) return;
    const userId = getStoredUserId();
    if (!userId) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }, [session, onClose, onSaved]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    try {
      const dataUrl = await compressImageFile(file);
      setThumbnailUrl(dataUrl);
      setError(null);
    } catch {
      setError("Could not process that image");
    }
  };

  if (!open || !session) return null;

  return (
    <div className="session-edit-root" role="dialog" aria-modal="true" aria-labelledby="session-edit-title">
      <button type="button" className="session-edit-backdrop" onClick={onClose} aria-label="Close" />
      <div className="session-edit-sheet">
        <div className="session-edit-handle" aria-hidden />
        <h2 id="session-edit-title" className="session-edit-title">
          Edit session
        </h2>

        <label className="session-edit-label">
          Name
          <input
            className="session-edit-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Sparring round 3"
          />
        </label>

        <label className="session-edit-label">
          About this session
          <textarea
            className="session-edit-textarea"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={160}
            rows={2}
            placeholder="One line on what you worked on or what the coach flagged"
          />
        </label>

        <div className="session-edit-label">
          Thumbnail
          <div className="session-edit-thumb-single">
            <div className="session-edit-thumb-preview">
              {thumbnailUrl?.startsWith("data:") || thumbnailUrl?.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="" className="session-edit-thumb-preview-img" />
              ) : session.resolved_thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.resolved_thumbnail} alt="" className="session-edit-thumb-preview-img" />
              ) : (
                <span className="session-edit-thumb-preview-fallback">▶</span>
              )}
            </div>
            <div className="session-edit-thumb-actions">
              <button
                type="button"
                className={`session-edit-thumb-action ${!thumbnailUrl ? "session-edit-thumb-action--active" : ""}`}
                onClick={() => setThumbnailUrl(null)}
              >
                Video frame
              </button>
              <label className="session-edit-thumb-action session-edit-thumb-action--upload">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleUpload(e.target.files?.[0])}
                />
                Upload photo
              </label>
            </div>
          </div>
        </div>

        {error && <p className="session-edit-error">{error}</p>}

        <div className="session-edit-actions">
          <button type="button" className="session-edit-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="session-edit-save"
            onClick={() => void save()}
            disabled={saving || deleting}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="session-edit-danger">
          {!confirmDelete ? (
            <button
              type="button"
              className="session-edit-delete"
              onClick={() => setConfirmDelete(true)}
              disabled={saving || deleting}
            >
              Delete session
            </button>
          ) : (
            <div className="session-edit-delete-confirm">
              <p>Remove this session and its report permanently?</p>
              <div className="session-edit-delete-actions">
                <button
                  type="button"
                  className="session-edit-cancel"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Keep
                </button>
                <button
                  type="button"
                  className="session-edit-delete-confirm-btn"
                  onClick={() => void remove()}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete forever"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
