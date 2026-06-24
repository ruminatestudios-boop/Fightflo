"use client";

import { useCallback, useEffect, useState } from "react";

const SECRET_KEY = "fightflo_admin_secret";

const TABS = [
  { id: "invite-codes", label: "Invite codes", path: "/admin/invite-codes" },
  { id: "scan-costs", label: "Scan costs", path: "/admin/scan-costs" },
  { id: "errors", label: "Errors", path: "/admin/errors" },
  { id: "accuracy", label: "Accuracy", path: "/admin/accuracy" },
  { id: "users", label: "Users", path: "/admin/users" },
  { id: "sessions", label: "Sessions", path: "/admin/sessions" },
  { id: "conversions", label: "Conversions", path: "/admin/conversions" },
  { id: "affiliates", label: "Affiliates", path: "/admin/affiliates" },
  { id: "testimonials", label: "Testimonials", path: "/admin/testimonials" },
  { id: "content-links", label: "Social links", path: "/admin/content-links" },
  { id: "tasks", label: "Tasks", path: "/admin/tasks" },
] as const;

export default function AdminHubPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);

  // Important: this check must finish (and write to sessionStorage) BEFORE
  // any tab iframe mounts, otherwise each iframe's own mount-time check
  // runs against an empty sessionStorage and shows its own password gate.
  const verify = useCallback(async (secretValue: string) => {
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) throw new Error("Wrong password");
      sessionStorage.setItem(SECRET_KEY, secretValue);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(SECRET_KEY) : null;
    if (stored) {
      setSecret(stored);
      void verify(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) {
    return (
      <div style={gatePageStyle}>
        <div style={gateCardStyle}>
          <h1 style={titleStyle}>Admin access</h1>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void verify(secret);
            }}
            style={inputStyle}
          />
          <button onClick={() => void verify(secret)} style={primaryBtnStyle}>
            {checking ? "Checking…" : "Enter"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={tabBarStyle}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id ? tabBtnActiveStyle : tabBtnStyle}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={frameWrapStyle}>
        {TABS.map((tab) => (
          <iframe
            key={tab.id}
            src={tab.path}
            title={tab.label}
            style={{
              ...frameStyle,
              display: activeTab === tab.id ? "block" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const gatePageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  display: "flex",
  justifyContent: "center",
  padding: "2rem 1rem",
  fontFamily: "system-ui, sans-serif",
};

const gateCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
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

const errorStyle: React.CSSProperties = {
  color: "#fa4141",
  fontSize: "0.85rem",
  marginTop: "0.5rem",
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  display: "flex",
  flexDirection: "column",
};

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.4rem",
  flexWrap: "wrap",
  padding: "0.85rem 1rem",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  background: "#000",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const tabBtnStyle: React.CSSProperties = {
  padding: "0.5rem 0.9rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.7)",
  fontSize: "0.8rem",
  fontFamily: "system-ui, sans-serif",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const tabBtnActiveStyle: React.CSSProperties = {
  ...tabBtnStyle,
  background: "#fa4141",
  borderColor: "#fa4141",
  color: "#fff",
  fontWeight: 600,
};

const frameWrapStyle: React.CSSProperties = {
  flex: 1,
};

const frameStyle: React.CSSProperties = {
  width: "100%",
  height: "calc(100vh - 64px)",
  border: "none",
};
