"use client";

import { useCallback, useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string | null;
  sport: string;
  level: string;
  is_pro: boolean;
  subscription_status: string;
  free_analyses_used: number;
  free_analyses_limit: number;
  bonus_scans: number;
  created_at: string;
  sessionCount: number;
}

const SECRET_KEY = "fightflo_admin_secret";

export default function UsersAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  const fetchUsers = useCallback(async (secretValue: string, query: string) => {
    setLoading(true);
    setError("");
    try {
      const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const res = await fetch(`/api/admin/users${qs}`, {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      }
      const json = (await res.json()) as { users: UserRow[] };
      setUsers(json.users);
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
    if (authed && secret) void fetchUsers(secret, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleGrantPro = useCallback(
    async (userId: string, currentIsPro: boolean) => {
      try {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ userId, isPro: !currentIsPro }),
        });
        if (!res.ok) throw new Error("Failed to update");
        await fetchUsers(secret, search);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update user");
      }
    },
    [secret, search, fetchUsers]
  );

  const handleAddBonusScans = useCallback(
    async (userId: string, currentBonus: number) => {
      const input = window.prompt("New bonus scan count:", String(currentBonus + 5));
      if (!input) return;
      const bonusScans = Number(input);
      if (Number.isNaN(bonusScans) || bonusScans < 0) return;

      try {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ userId, bonusScans }),
        });
        if (!res.ok) throw new Error("Failed to update");
        await fetchUsers(secret, search);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update user");
      }
    },
    [secret, search, fetchUsers]
  );

  const handleExportCsv = useCallback(
    async (emailsOnly: boolean) => {
      try {
        const res = await fetch(`/api/admin/users/export?emailsOnly=${emailsOnly}`, {
          headers: { "x-admin-secret": secret },
        });
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fightflo-users-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      }
    },
    [secret]
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
              if (e.key === "Enter") void fetchUsers(secret, search);
            }}
            style={inputStyle}
          />
          <button onClick={() => void fetchUsers(secret, search)} style={primaryBtnStyle}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={titleStyle}>Users</h1>
            <p style={subStyle}>Search by user ID or email, manage Pro/bonus access</p>
          </div>
          <button onClick={() => void fetchUsers(secret, search)} style={smallBtnStyle} disabled={loading}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <input
            type="text"
            placeholder="search id or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void fetchUsers(secret, search);
            }}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          />
          <button onClick={() => void fetchUsers(secret, search)} style={smallBtnStyle}>
            Search
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <button onClick={() => void handleExportCsv(true)} style={smallBtnStyle}>
            Export emails (CSV)
          </button>
          <button onClick={() => void handleExportCsv(false)} style={smallBtnStyle}>
            Export all users (CSV)
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {users.length === 0 ? (
            <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>No users found.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} style={rowStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.8rem", fontFamily: "monospace", opacity: 0.8 }}>
                    {u.email || u.id.slice(0, 16) + "…"}
                  </span>
                  {u.is_pro ? (
                    <span style={{ fontSize: "0.72rem", color: "#4ade80", fontWeight: 600 }}>PRO</span>
                  ) : (
                    <span style={{ fontSize: "0.72rem", opacity: 0.5 }}>FREE</span>
                  )}
                </div>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                  {u.sport} · {u.level} · {u.sessionCount} session{u.sessionCount === 1 ? "" : "s"} ·{" "}
                  {u.free_analyses_used}/{u.free_analyses_limit} free used · {u.bonus_scans} bonus
                </p>
                <p style={{ margin: "0.2rem 0 0.6rem", fontSize: "0.68rem", opacity: 0.4 }}>
                  {u.id} · joined {new Date(u.created_at).toLocaleDateString()}
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => void handleGrantPro(u.id, u.is_pro)} style={smallBtnStyle}>
                    {u.is_pro ? "Revoke Pro" : "Grant Pro"}
                  </button>
                  <button onClick={() => void handleAddBonusScans(u.id, u.bonus_scans)} style={smallBtnStyle}>
                    Set bonus scans
                  </button>
                </div>
              </div>
            ))
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
