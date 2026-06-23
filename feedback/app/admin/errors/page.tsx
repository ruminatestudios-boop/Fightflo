"use client";

import { useCallback, useEffect, useState } from "react";

interface ClientErrorRow {
  id: string;
  message: string;
  stack: string | null;
  context: string | null;
  url: string | null;
  user_agent: string | null;
  user_id: string | null;
  created_at: string;
}

const SECRET_KEY = "fightflo_admin_secret";

function platformFromUserAgent(ua: string | null): string {
  if (!ua) return "—";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  return "Desktop";
}

export default function ErrorsAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [errors, setErrors] = useState<ClientErrorRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  const fetchErrors = useCallback(async (secretValue: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/errors", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      }
      const json = (await res.json()) as { errors: ClientErrorRow[] };
      setErrors(json.errors);
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
    if (authed && secret) void fetchErrors(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

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
              if (e.key === "Enter") void fetchErrors(secret);
            }}
            style={inputStyle}
          />
          <button onClick={() => void fetchErrors(secret)} style={primaryBtnStyle}>
            {loading ? "Checking…" : "Enter"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "680px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={titleStyle}>Diagnostics</h1>
            <p style={subStyle}>Real errors from real users, most recent first</p>
          </div>
          <button onClick={() => void fetchErrors(secret)} style={smallBtnStyle} disabled={loading}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
          {errors.length === 0 ? (
            <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>No errors logged. Good sign.</p>
          ) : (
            errors.map((e) => {
              const expanded = expandedId === e.id;
              return (
                <div key={e.id} style={rowStyle}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}
                    onClick={() => setExpandedId(expanded ? null : e.id)}
                  >
                    <span style={{ fontSize: "0.82rem", color: "#fa4141", fontWeight: 600 }}>
                      {e.message.slice(0, 90)}
                    </span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.4, whiteSpace: "nowrap", marginLeft: "0.5rem" }}>
                      {platformFromUserAgent(e.user_agent)}
                    </span>
                  </div>
                  <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", opacity: 0.5 }}>
                    {e.context ?? "unknown"} · {new Date(e.created_at).toLocaleString()}
                    {e.user_id ? ` · ${e.user_id.slice(0, 10)}…` : ""}
                  </p>
                  {expanded ? (
                    <div style={{ marginTop: "0.6rem", fontSize: "0.72rem", opacity: 0.7 }}>
                      {e.url ? <p style={{ margin: "0 0 0.4rem", wordBreak: "break-all" }}>URL: {e.url}</p> : null}
                      {e.stack ? (
                        <pre
                          style={{
                            margin: 0,
                            padding: "0.6rem",
                            background: "#000",
                            borderRadius: "0.5rem",
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            fontSize: "0.68rem",
                          }}
                        >
                          {e.stack}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
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
