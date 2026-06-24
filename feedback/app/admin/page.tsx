"use client";

import { useState } from "react";

const TABS = [
  { id: "invite-codes", label: "Invite codes", path: "/admin/invite-codes" },
  { id: "scan-costs", label: "Scan costs", path: "/admin/scan-costs" },
  { id: "errors", label: "Errors", path: "/admin/errors" },
  { id: "users", label: "Users", path: "/admin/users" },
  { id: "sessions", label: "Sessions", path: "/admin/sessions" },
  { id: "conversions", label: "Conversions", path: "/admin/conversions" },
  { id: "affiliates", label: "Affiliates", path: "/admin/affiliates" },
  { id: "testimonials", label: "Testimonials", path: "/admin/testimonials" },
  { id: "content-links", label: "Social links", path: "/admin/content-links" },
  { id: "tasks", label: "Tasks", path: "/admin/tasks" },
] as const;

export default function AdminHubPage() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);

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
