"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isPresetThumbnail,
  presetEmoji,
  type SessionLibraryEntry,
} from "@/lib/sessions/library";
import { absoluteReportUrl } from "@/lib/paths";
import { FlowAction, FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface CoachShareFlowProps {
  sessions: SessionLibraryEntry[];
  defaultSessionId?: string | null;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ClipThumbnail({ session }: { session: SessionLibraryEntry }) {
  const preset = isPresetThumbnail(session.thumbnail_url)
    ? presetEmoji(session.thumbnail_url)
    : null;

  if (preset) {
    return (
      <span className="home-coach-clip-thumb home-coach-clip-thumb--preset">{preset}</span>
    );
  }

  const src =
    session.thumbnail_url?.startsWith("data:") || session.thumbnail_url?.startsWith("http")
      ? session.thumbnail_url
      : session.resolved_thumbnail;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="home-coach-clip-thumb" loading="lazy" />
    );
  }

  return <span className="home-coach-clip-thumb home-coach-clip-thumb--preset">🎬</span>;
}

export function CoachShareFlow({
  sessions,
  defaultSessionId,
}: CoachShareFlowProps) {
  const completeSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "complete")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [sessions]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (completeSessions.length === 0) {
      setSelectedId(null);
      return;
    }

    const preferred = defaultSessionId ?? completeSessions[0]?.id ?? null;
    const exists = completeSessions.some((session) => session.id === preferred);
    setSelectedId(exists ? preferred : completeSessions[0].id);
  }, [completeSessions, defaultSessionId]);

  const selectedSession = completeSessions.find((session) => session.id === selectedId) ?? null;
  const shareUrl = selectedSession ? absoluteReportUrl(selectedSession.id) : "";

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    setShareError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareError("Could not copy — select the link below and copy manually.");
    }
  }, [shareUrl]);

  const nativeShare = useCallback(async () => {
    if (!selectedSession || !shareUrl) return;
    setShareError(null);
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: `Fightflo coaching — ${selectedSession.resolved_title}`,
        text: selectedSession.resolved_summary,
        url: shareUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareError("Share failed — try copy link instead.");
    }
  }, [copyLink, selectedSession, shareUrl]);

  const handleSelect = (sessionId: string) => {
    setSelectedId(sessionId);
    setCopied(false);
    setShareError(null);
  };

  return (
    <FlowShell title="Share with coach" subtitle="View-only report link">
      {completeSessions.length === 0 ? (
        <FlowEmpty message="Analyse a clip first — then send your coach the breakdown link." />
      ) : (
        <>
          <FlowPanel>
            <p className="home-flow-label">Choose footage</p>
            <ul className="home-coach-clips">
              {completeSessions.map((session) => {
                const selected = session.id === selectedId;
                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      className={`home-coach-clip${selected ? " home-coach-clip--selected" : ""}`}
                      onClick={() => handleSelect(session.id)}
                      aria-pressed={selected}
                    >
                      <ClipThumbnail session={session} />
                      <span className="home-coach-clip-body">
                        <span className="home-coach-clip-title">{session.resolved_title}</span>
                        <span className="home-coach-clip-meta">
                          {formatSessionDate(session.created_at)} · {session.level}
                        </span>
                        <span className="home-coach-clip-summary">{session.resolved_summary}</span>
                      </span>
                      <span
                        className={`home-coach-clip-check${selected ? " home-coach-clip-check--selected" : ""}`}
                        aria-hidden
                      >
                        {selected ? (
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5l3 3 6-6" />
                          </svg>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </FlowPanel>

          {selectedSession ? (
            <>
              <FlowPanel>
                <p className="home-flow-label">Coach link</p>
                <p className="home-flow-link">{shareUrl}</p>
              </FlowPanel>
              <FlowAction onClick={() => void copyLink()}>
                {copied ? "Link copied" : "Copy coach link"}
              </FlowAction>
              <FlowAction variant="secondary" onClick={() => void nativeShare()}>
                Share…
              </FlowAction>
              {shareError ? <p className="glass-error">{shareError}</p> : null}
              <p className="home-flow-hint">
                Anyone with the link can view timestamps, faults, and drills — no account
                needed.
              </p>
            </>
          ) : null}
        </>
      )}
    </FlowShell>
  );
}
