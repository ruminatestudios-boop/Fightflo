"use client";

import { useCallback, useEffect, useState } from "react";

interface TestimonialRow {
  id: string;
  name: string | null;
  body: string;
  rating: number | null;
  approved: boolean;
  created_at: string;
}

const SECRET_KEY = "fightflo_admin_secret";

export default function TestimonialsAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<TestimonialRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  const fetchItems = useCallback(async (secretValue: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/testimonials", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      const json = (await res.json()) as { testimonials: TestimonialRow[] };
      setItems(json.testimonials);
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
    if (authed && secret) void fetchItems(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const toggleApproved = useCallback(
    async (id: string, approved: boolean) => {
      try {
        const res = await fetch("/api/admin/testimonials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ id, approved: !approved }),
        });
        if (!res.ok) throw new Error("Failed");
        await fetchItems(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
      }
    },
    [secret, fetchItems]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this testimonial?")) return;
      try {
        const res = await fetch(`/api/admin/testimonials?id=${id}`, {
          method: "DELETE",
          headers: { "x-admin-secret": secret },
        });
        if (!res.ok) throw new Error("Failed");
        await fetchItems(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    },
    [secret, fetchItems]
  );

  const copyText = useCallback((t: TestimonialRow) => {
    const text = t.name ? `"${t.body}" — ${t.name}` : `"${t.body}"`;
    void navigator.clipboard.writeText(text);
  }, []);

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
              if (e.key === "Enter") void fetchItems(secret);
            }}
            style={inputStyle}
          />
          <button onClick={() => void fetchItems(secret)} style={primaryBtnStyle}>
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
            <h1 style={titleStyle}>Testimonials</h1>
            <p style={subStyle}>
              Share this link to collect reviews: fightflo.app/testimonial
            </p>
          </div>
          <button onClick={() => void fetchItems(secret)} style={smallBtnStyle} disabled={loading}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>
          {items.length === 0 ? (
            <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>No testimonials yet.</p>
          ) : (
            items.map((t) => (
              <div key={t.id} style={rowStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {t.name || "Anonymous"}
                  </span>
                  {t.rating ? (
                    <span style={{ color: "#fa4141", fontSize: "0.8rem" }}>
                      {"★".repeat(t.rating)}
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>
                        {"★".repeat(5 - t.rating)}
                      </span>
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: "0.4rem 0", fontSize: "0.88rem", lineHeight: 1.4 }}>
                  &quot;{t.body}&quot;
                </p>
                <p style={{ margin: "0 0 0.6rem", fontSize: "0.7rem", opacity: 0.4 }}>
                  {new Date(t.created_at).toLocaleDateString()}
                  {t.approved ? " · APPROVED" : ""}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button onClick={() => void toggleApproved(t.id, t.approved)} style={smallBtnStyle}>
                    {t.approved ? "Unapprove" : "Approve"}
                  </button>
                  <button onClick={() => copyText(t)} style={smallBtnStyle}>
                    Copy text
                  </button>
                  <button onClick={() => void handleDelete(t.id)} style={dangerBtnStyle}>
                    Delete
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

const dangerBtnStyle: React.CSSProperties = {
  padding: "0.45rem 0.9rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(250,65,65,0.4)",
  background: "rgba(250,65,65,0.1)",
  color: "#fa4141",
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
