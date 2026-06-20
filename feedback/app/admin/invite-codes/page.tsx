"use client";

import { useCallback, useEffect, useState } from "react";

interface InviteCode {
  code: string;
  label: string | null;
  total_limit: number;
  used_count: number;
  active: boolean;
  created_at: string;
}

const SECRET_KEY = "fightflo_admin_secret";

export default function InviteCodesAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newLimit, setNewLimit] = useState("10");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  const fetchCodes = useCallback(async (secretValue: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/invite-codes", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Wrong password" : "Failed to load codes");
      }
      const data = (await res.json()) as { codes: InviteCode[] };
      setCodes(data.codes);
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
    if (authed && secret) void fetchCodes(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleCreate = useCallback(async () => {
    if (!newCode.trim() || !newLimit) return;
    setError("");
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          code: newCode.trim(),
          label: newLabel.trim() || undefined,
          totalLimit: Number(newLimit),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setNewCode("");
      setNewLabel("");
      setNewLimit("10");
      await fetchCodes(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create code");
    }
  }, [newCode, newLabel, newLimit, secret, fetchCodes]);

  const handleBump = useCallback(
    async (code: string, currentLimit: number) => {
      const input = window.prompt(`New total limit for ${code}:`, String(currentLimit + 10));
      if (!input) return;
      const totalLimit = Number(input);
      if (!totalLimit || totalLimit <= 0) return;

      try {
        const res = await fetch("/api/admin/invite-codes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ code, totalLimit }),
        });
        if (!res.ok) throw new Error("Failed to update");
        await fetchCodes(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update code");
      }
    },
    [secret, fetchCodes]
  );

  const handleToggleActive = useCallback(
    async (code: string, active: boolean) => {
      try {
        const res = await fetch("/api/admin/invite-codes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ code, active: !active }),
        });
        if (!res.ok) throw new Error("Failed to update");
        await fetchCodes(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update code");
      }
    },
    [secret, fetchCodes]
  );

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
              if (e.key === "Enter") void fetchCodes(secret);
            }}
            style={inputStyle}
          />
          <button onClick={() => void fetchCodes(secret)} style={primaryBtnStyle}>
            {loading ? "Checking…" : "Enter"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "640px" }}>
        <h1 style={titleStyle}>Invite codes</h1>
        <p style={subStyle}>fightflo.app/feed?crew=CODE</p>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1.5rem" }}>
          {codes.map((c) => (
            <div key={c.code} style={rowStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: "0.95rem" }}>{c.code}</strong>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>{c.label ?? ""}</span>
              </div>
              <p style={{ margin: "0.35rem 0", fontSize: "0.85rem", opacity: 0.8 }}>
                {c.used_count} / {c.total_limit} used
                {!c.active ? " · DEACTIVATED" : ""}
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => void handleBump(c.code, c.total_limit)} style={smallBtnStyle}>
                  Bump limit
                </button>
                <button onClick={() => void handleToggleActive(c.code, c.active)} style={smallBtnStyle}>
                  {c.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem" }}>
          <p style={subStyle}>Create new code</p>
          <input
            type="text"
            placeholder="code (e.g. fightflo-jordan)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="label (optional, e.g. Jordan)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="scan limit"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            style={inputStyle}
          />
          <button onClick={() => void handleCreate()} style={primaryBtnStyle}>
            Create code
          </button>
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
  marginBottom: "1rem",
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
  padding: "0.45rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: "0.78rem",
  cursor: "pointer",
};

const rowStyle: React.CSSProperties = {
  padding: "0.9rem 1rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d0d",
};

const errorStyle: React.CSSProperties = {
  color: "#fa4141",
  fontSize: "0.85rem",
  marginTop: "0.5rem",
};
