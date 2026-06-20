"use client";

import { useCallback, useEffect, useState } from "react";

interface SessionRow {
  id: string;
  user_id: string | null;
  sport: string;
  level: string;
  status: string;
  progress_step?: string | null;
  progress_message?: string | null;
  video_duration: number;
  invite_code?: string | null;
  created_at: string;
}

interface SessionsSummary {
  sessions: SessionRow[];
  failedCount: number;
  completeCount: number;
  totalCount: number;
}

const SECRET_KEY = "fightflo_admin_secret";

type StatusFilter = "all" | "failed" | "complete" | "processing";

function statusColor(status: string): string {
  if (status === "failed") return "#fa4141";
  if (status === "complete") return "#4ade80";
  return "#888";
}

export default function SessionsAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<SessionsSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("failed");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  const fetchData = useCallback(async (secretValue: string, statusFilter: StatusFilter) => {
    setLoading(true);
    setError("");
    try {
      const qs = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const res = await fetch(`/api/admin/sessions${qs}`, {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      }
      const json = (await res.json()) as SessionsSummary;
      setData(json);
      setAuthed(true);
      sessionStorage.setItem(SECRET_KEY, secretValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && secret) void fetchData(secret, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, filter]);

  if (!authed) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Admin access</h1>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void fetchData(secret, filter);
            }}
            style={inputStyle}
          />
          <button onClick={() => void fetchData(secret, filter)} style={primaryBtnStyle}>
            {loading ? "Checking…" : "Enter"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "700px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={titleStyle}>Sessions</h1>
            <p style={subStyle}>Recent scans, status, and error messages</p>
          </div>
          <button onClick={() => void fetchData(secret, filter)} style={smallBtnStyle} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {(["failed", "complete", "processing", "all"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={f === filter ? activeFilterBtnStyle : smallBtnStyle}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {data ? (
          <>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <StatCard label="Showing" value={String(data.totalCount)} />
              <StatCard label="Failed" value={String(data.failedCount)} />
              <StatCard label="Complete" value={String(data.completeCount)} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.sessions.length === 0 ? (
                <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>No sessions match this filter.</p>
              ) : (
                data.sessions.map((s) => (
                  <div key={s.id} style={rowStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>
                        {s.sport} · {s.level} · {s.video_duration}s
                        {s.invite_code ? ` · ${s.invite_code}` : ""}
                      </span>
                      <strong style={{ fontSize: "0.78rem", color: statusColor(s.status) }}>
                        {s.status.toUpperCase()}
                      </strong>
                    </div>
                    {s.progress_message ? (
                      <p
                        style={{
                          margin: "0.35rem 0 0",
                          fontSize: "0.78rem",
                          fontFamily: s.status === "failed" ? "monospace" : "inherit",
                          color: s.status === "failed" ? "#fa4141" : "rgba(255,255,255,0.6)",
                          wordBreak: "break-word",
                        }}
                      >
                        {s.progress_message}
                      </p>
                    ) : null}
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", opacity: 0.4 }}>
                      {s.id} · {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...rowStyle, flex: 1, minWidth: "120px" }}>
      <p style={{ margin: 0, fontSize: "0.72rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </p>
      <p style={{ margin: "0.25rem 0 0", fontSize: "1.25rem", fontWeight: 700 }}>{value}</p>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  display: "flex",
  justifyContent: "center",
  padding: "2rem 1rem",
  fontFamily: "system-ui, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  marginBottom: "0.5rem",
};

const subStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  opacity: 0.6,
  marginBottom: "0.75rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.9rem",
  borderRadius: "0.65rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  marginBottom: "0.6rem",
  fontSize: "0.9rem",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.65rem",
  border: "none",
  background: "#fa4141",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "0.45rem 0.9rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "0.8rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const activeFilterBtnStyle: React.CSSProperties = {
  ...smallBtnStyle,
  background: "#fa4141",
  borderColor: "#fa4141",
};

const rowStyle: React.CSSProperties = {
  padding: "0.75rem 0.9rem",
  borderRadius: "0.7rem",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d0d",
};

const errorStyle: React.CSSProperties = {
  color: "#fa4141",
  fontSize: "0.85rem",
  marginTop: "0.5rem",
};
