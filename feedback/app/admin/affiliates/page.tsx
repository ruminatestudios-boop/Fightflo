"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface AffiliateCode {
  code: string;
  creator_name: string;
  commission_type: "percent" | "flat";
  commission_value: number;
  active: boolean;
  created_at: string;
}

interface AffiliateCommission {
  id: string;
  code: string;
  creator_name: string;
  stripe_session_id: string | null;
  sale_amount_usd: number;
  commission_usd: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

const SECRET_KEY = "fightflo_admin_secret";

export default function AffiliatesAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [codes, setCodes] = useState<AffiliateCode[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newCreator, setNewCreator] = useState("");
  const [newType, setNewType] = useState<"percent" | "flat">("percent");
  const [newValue, setNewValue] = useState("10");

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
      const res = await fetch("/api/admin/affiliates", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      }
      const data = (await res.json()) as {
        codes: AffiliateCode[];
        commissions: AffiliateCommission[];
      };
      setCodes(data.codes);
      setCommissions(data.commissions);
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

  const handleCreate = useCallback(async () => {
    if (!newCode.trim() || !newCreator.trim() || !newValue) return;
    setError("");
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          code: newCode.trim(),
          creatorName: newCreator.trim(),
          commissionType: newType,
          commissionValue: Number(newValue),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setNewCode("");
      setNewCreator("");
      setNewValue("10");
      await fetchData(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create code");
    }
  }, [newCode, newCreator, newType, newValue, secret, fetchData]);

  const handleToggleActive = useCallback(
    async (code: string, active: boolean) => {
      try {
        const res = await fetch("/api/admin/affiliates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ code, active: !active }),
        });
        if (!res.ok) throw new Error("Failed to update");
        await fetchData(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update code");
      }
    },
    [secret, fetchData]
  );

  const handleDelete = useCallback(
    async (code: string) => {
      if (!window.confirm(`Permanently delete "${code}"? This cannot be undone.`)) return;
      try {
        const res = await fetch(`/api/admin/affiliates?code=${encodeURIComponent(code)}`, {
          method: "DELETE",
          headers: { "x-admin-secret": secret },
        });
        if (!res.ok) throw new Error("Failed to delete");
        await fetchData(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete code");
      }
    },
    [secret, fetchData]
  );

  const handleMarkPaid = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/admin/affiliates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ markCommissionPaidId: id }),
        });
        if (!res.ok) throw new Error("Failed to update");
        await fetchData(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mark paid");
      }
    },
    [secret, fetchData]
  );

  const balances = useMemo(() => {
    const byCode = new Map<string, { creator: string; owed: number; paid: number }>();
    for (const c of commissions) {
      const existing = byCode.get(c.code) ?? { creator: c.creator_name, owed: 0, paid: 0 };
      if (c.paid) existing.paid += c.commission_usd;
      else existing.owed += c.commission_usd;
      byCode.set(c.code, existing);
    }
    return Array.from(byCode.entries()).map(([code, v]) => ({ code, ...v }));
  }, [commissions]);

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
      <div style={{ ...cardStyle, maxWidth: "720px" }}>
        <h1 style={titleStyle}>Affiliate codes</h1>
        <p style={subStyle}>Pass ?affiliateCode=CODE through to /api/checkout</p>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <h2 style={sectionTitleStyle}>Balances owed</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
          {balances.length === 0 ? (
            <p style={subStyle}>No commissions yet.</p>
          ) : (
            balances.map((b) => (
              <div key={b.code} style={rowStyle}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "0.9rem" }}>
                    {b.creator} <span style={{ opacity: 0.6 }}>({b.code})</span>
                  </strong>
                  <span style={{ fontSize: "0.85rem", color: b.owed > 0 ? "#fa4141" : "#5ad15a" }}>
                    ${b.owed.toFixed(2)} owed
                  </span>
                </div>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", opacity: 0.55 }}>
                  ${b.paid.toFixed(2)} already paid
                </p>
              </div>
            ))
          )}
        </div>

        <h2 style={sectionTitleStyle}>Commission ledger</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {commissions.length === 0 ? (
            <p style={subStyle}>No sales attributed yet.</p>
          ) : (
            commissions.map((c) => (
              <div key={c.id} style={rowStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: "0.85rem" }}>
                    {c.creator_name} · {c.code}
                  </strong>
                  <span style={{ fontSize: "0.78rem", opacity: 0.55 }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: "0.3rem 0", fontSize: "0.8rem", opacity: 0.8 }}>
                  Sale: ${c.sale_amount_usd.toFixed(2)} · Commission: ${c.commission_usd.toFixed(2)}
                  {c.paid ? " · PAID" : ""}
                </p>
                {!c.paid ? (
                  <button onClick={() => void handleMarkPaid(c.id)} style={smallBtnStyle}>
                    Mark as paid
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>

        <h2 style={sectionTitleStyle}>Codes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {codes.map((c) => (
            <div key={c.code} style={rowStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: "0.95rem" }}>{c.code}</strong>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>{c.creator_name}</span>
              </div>
              <p style={{ margin: "0.35rem 0", fontSize: "0.85rem", opacity: 0.8 }}>
                {c.commission_type === "percent"
                  ? `${c.commission_value}% per sale`
                  : `$${c.commission_value} flat per sale`}
                {!c.active ? " · DEACTIVATED" : ""}
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => void handleToggleActive(c.code, c.active)} style={smallBtnStyle}>
                  {c.active ? "Deactivate" : "Reactivate"}
                </button>
                {!c.active ? (
                  <button onClick={() => void handleDelete(c.code)} style={dangerBtnStyle}>
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem" }}>
          <p style={subStyle}>Create new code</p>
          <input
            type="text"
            placeholder="code (e.g. jordan10)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="creator name"
            value={newCreator}
            onChange={(e) => setNewCreator(e.target.value)}
            style={inputStyle}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "percent" | "flat")}
            style={inputStyle}
          >
            <option value="percent">Percent of sale</option>
            <option value="flat">Flat fee per sale</option>
          </select>
          <input
            type="number"
            placeholder={newType === "percent" ? "commission %" : "commission $"}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  margin: "0 0 0.75rem",
  opacity: 0.85,
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

const dangerBtnStyle: React.CSSProperties = {
  padding: "0.45rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(250,65,65,0.4)",
  background: "rgba(250,65,65,0.1)",
  color: "#fa4141",
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
