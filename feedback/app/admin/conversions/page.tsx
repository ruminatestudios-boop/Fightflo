"use client";

import { useCallback, useEffect, useState } from "react";

interface ConversionFunnel {
  totalUsers: number;
  withEmail: number;
  hitFreeLimit: number;
  hitFreeLimitWithEmail: number;
  proUsers: number;
  recentSignups: { id: string; email: string | null; created_at: string }[];
}

const SECRET_KEY = "fightflo_admin_secret";

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default function ConversionsAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<ConversionFunnel | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  const fetchData = useCallback(async (secretValue: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/conversions", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      }
      const json = (await res.json()) as ConversionFunnel;
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
    if (authed && secret) void fetchData(secret);
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
              if (e.key === "Enter") void fetchData(secret);
            }}
            style={inputStyle}
          />
          <button onClick={() => void fetchData(secret)} style={primaryBtnStyle}>
            {loading ? "Checking…" : "Enter"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "620px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={titleStyle}>Conversions</h1>
            <p style={subStyle}>Signup → email → free limit hit → paid</p>
          </div>
          <button onClick={() => void fetchData(secret)} style={smallBtnStyle} disabled={loading}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}

        {data ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>
              <FunnelRow
                label="Total signups"
                count={data.totalUsers}
                of={data.totalUsers}
              />
              <FunnelRow
                label="Gave an email"
                count={data.withEmail}
                of={data.totalUsers}
              />
              <FunnelRow
                label="Hit free scan limit"
                count={data.hitFreeLimit}
                of={data.totalUsers}
              />
              <FunnelRow
                label="— of those, gave email"
                count={data.hitFreeLimitWithEmail}
                of={data.hitFreeLimit}
                indent
              />
              <FunnelRow
                label="Converted to Pro"
                count={data.proUsers}
                of={data.hitFreeLimit}
                highlight
              />
            </div>

            <p style={{ ...subStyle, marginTop: "1.5rem" }}>Recent signups</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {data.recentSignups.length === 0 ? (
                <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>No signups yet.</p>
              ) : (
                data.recentSignups.map((u) => (
                  <div key={u.id} style={rowStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.78rem", fontFamily: "monospace", opacity: 0.8 }}>
                        {u.email || u.id.slice(0, 16) + "…"}
                      </span>
                      <span style={{ fontSize: "0.72rem", opacity: 0.4 }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
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

function FunnelRow({
  label,
  count,
  of,
  indent = false,
  highlight = false,
}: {
  label: string;
  count: number;
  of: number;
  indent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        ...rowStyle,
        marginLeft: indent ? "1rem" : 0,
        borderColor: highlight ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.1)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "0.82rem", opacity: 0.85 }}>{label}</span>
        <span style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
          <strong style={{ fontSize: "1rem", color: highlight ? "#4ade80" : "#fff" }}>{count}</strong>
          <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>{pct(count, of)}</span>
        </span>
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
