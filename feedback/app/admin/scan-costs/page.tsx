"use client";

import { useCallback, useEffect, useState } from "react";

interface PerUserCost {
  userId: string;
  scanCount: number;
  totalUsd: number;
}

interface ScanCostRow {
  id: string;
  session_id: string | null;
  user_id: string | null;
  sport: string | null;
  status: string;
  pipeline: string;
  video_duration_sec: number;
  duration_sec: number;
  gemini_usd: number;
  cloudinary_usd: number;
  compute_usd: number;
  total_usd: number;
  created_at: string;
}

interface ScanCostSummary {
  totalUsd: number;
  scanCount: number;
  avgUsd: number;
  perUser: PerUserCost[];
  recent: ScanCostRow[];
}

const SECRET_KEY = "fightflo_admin_secret";

// Fixed approximate rate — good enough for a cost dashboard, not for invoicing.
const USD_TO_GBP = 0.79;

function formatGbp(usdValue: number): string {
  return `£${(usdValue * USD_TO_GBP).toFixed(4)}`;
}

export default function ScanCostsAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<ScanCostSummary | null>(null);
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
      const res = await fetch("/api/admin/scan-costs", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      }
      const json = (await res.json()) as ScanCostSummary;
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
      <div style={{ ...cardStyle, maxWidth: "680px" }}>
        <h1 style={titleStyle}>Scan costs</h1>
        <p style={subStyle}>Estimated Gemini + Cloudinary + compute cost per scan</p>

        {error ? <p style={errorStyle}>{error}</p> : null}

        {data ? (
          <>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <StatCard label="Total spend" value={formatGbp(data.totalUsd)} />
              <StatCard label="Total scans" value={String(data.scanCount)} />
              <StatCard label="Avg per scan" value={formatGbp(data.avgUsd)} />
            </div>

            <p style={subStyle}>Cost per user</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
              {data.perUser.length === 0 ? (
                <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>No scans recorded yet.</p>
              ) : (
                data.perUser.map((u) => (
                  <div key={u.userId} style={rowStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.8rem", fontFamily: "monospace", opacity: 0.8 }}>
                        {u.userId === "unknown" ? "(no user id)" : u.userId.slice(0, 12) + "…"}
                      </span>
                      <strong style={{ fontSize: "0.85rem" }}>{formatGbp(u.totalUsd)}</strong>
                    </div>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.55 }}>
                      {u.scanCount} scan{u.scanCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ))
              )}
            </div>

            <p style={subStyle}>Recent scans</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.recent.map((r) => (
                <div key={r.id} style={rowStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>
                      {r.sport ?? "—"} · {r.status} · {r.pipeline}
                    </span>
                    <strong style={{ fontSize: "0.82rem" }}>{formatGbp(Number(r.total_usd))}</strong>
                  </div>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", opacity: 0.5 }}>
                    gemini {formatGbp(Number(r.gemini_usd))} · cloudinary {formatGbp(Number(r.cloudinary_usd))} ·
                    compute {formatGbp(Number(r.compute_usd))} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...rowStyle, flex: 1, minWidth: "140px" }}>
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
