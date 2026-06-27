"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Project = "fightflo" | "synclyst";

interface ContentLink {
  id: string;
  url: string;
  platform: string;
  label: string | null;
  tags: string[];
  notes: string | null;
  project: Project;
  created_at: string;
}

const SECRET_KEY = "fightflo_admin_secret";

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  youtube: "▶️",
  x: "✕",
  other: "🔗",
};

const PROJECTS: { id: Project; label: string; accent: string }[] = [
  { id: "fightflo", label: "Fightflo", accent: "#fa4141" },
  { id: "synclyst", label: "Synclyst", accent: "#a855f7" },
];

export default function ContentLinksAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<ContentLink[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [drafts, setDrafts] = useState<
    Record<Project, { url: string; label: string; tags: string; notes: string }>
  >({
    fightflo: { url: "", label: "", tags: "", notes: "" },
    synclyst: { url: "", label: "", tags: "", notes: "" },
  });
  const [saving, setSaving] = useState<Project | null>(null);
  const [filterTag, setFilterTag] = useState<Record<Project, string | null>>({
    fightflo: null,
    synclyst: null,
  });

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
      const res = await fetch("/api/admin/content-links", {
        headers: { "x-admin-secret": secretValue },
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Wrong password" : "Failed to load");
      const json = (await res.json()) as { links: ContentLink[] };
      setItems(json.links);
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

  const handleSave = useCallback(
    async (project: Project) => {
      const draft = drafts[project];
      if (!draft.url.trim()) {
        setError("Paste a link first");
        return;
      }
      setSaving(project);
      setError("");
      try {
        const tags = draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const res = await fetch("/api/admin/content-links", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ url: draft.url, label: draft.label, tags, notes: draft.notes, project }),
        });
        if (!res.ok) throw new Error("Failed to save");
        setDrafts((prev) => ({ ...prev, [project]: { url: "", label: "", tags: "", notes: "" } }));
        await fetchItems(secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving(null);
      }
    },
    [drafts, secret, fetchItems]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this link?")) return;
      try {
        const res = await fetch(`/api/admin/content-links?id=${id}`, {
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
      <div style={{ ...cardStyle, maxWidth: "720px" }}>
        <h1 style={titleStyle}>Content swipe file</h1>
        <p style={subStyle}>Paste a TikTok/IG/etc link, label it, tag it, come back later.</p>
        {error ? <p style={errorStyle}>{error}</p> : null}

        {PROJECTS.map((proj) => {
          const projItems = items.filter((item) => item.project === proj.id);
          const allTags = Array.from(
            new Set(projItems.flatMap((item) => item.tags))
          ).sort();
          const activeFilterTag = filterTag[proj.id];
          const visibleItems = activeFilterTag
            ? projItems.filter((item) => item.tags.includes(activeFilterTag))
            : projItems;
          const draft = drafts[proj.id];

          return (
            <div
              key={proj.id}
              style={{ ...projectSectionStyle, borderColor: `${proj.accent}33` }}
            >
              <h2 style={{ ...projectTitleStyle, color: proj.accent, borderColor: `${proj.accent}33` }}>
                {proj.label}
              </h2>

              <div style={formBoxStyle}>
                <input
                  type="text"
                  placeholder="Paste link here (TikTok, IG, YouTube...)"
                  value={draft.url}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [proj.id]: { ...prev[proj.id], url: e.target.value } }))
                  }
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Label (e.g. 'good hook style')"
                  value={draft.label}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [proj.id]: { ...prev[proj.id], label: e.target.value } }))
                  }
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Tags, comma separated"
                  value={draft.tags}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [proj.id]: { ...prev[proj.id], tags: e.target.value } }))
                  }
                  style={inputStyle}
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={draft.notes}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [proj.id]: { ...prev[proj.id], notes: e.target.value } }))
                  }
                  style={{ ...inputStyle, resize: "vertical" as const }}
                  rows={2}
                />
                <button
                  onClick={() => void handleSave(proj.id)}
                  disabled={saving === proj.id}
                  style={{ ...primaryBtnStyle, background: proj.accent }}
                >
                  {saving === proj.id ? "Saving…" : "Save link"}
                </button>
              </div>

              {allTags.length > 0 ? (
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "1rem 0 0.5rem" }}>
                  <button
                    onClick={() => setFilterTag((prev) => ({ ...prev, [proj.id]: null }))}
                    style={
                      activeFilterTag === null
                        ? tagChipActiveStyle(proj.accent)
                        : tagChipStyle
                    }
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setFilterTag((prev) => ({ ...prev, [proj.id]: tag }))}
                      style={
                        activeFilterTag === tag ? tagChipActiveStyle(proj.accent) : tagChipStyle
                      }
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>
                {visibleItems.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>No links saved yet.</p>
                ) : (
                  visibleItems.map((item) => (
                    <div key={item.id} style={rowStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 600, wordBreak: "break-all" }}
                        >
                          {PLATFORM_EMOJI[item.platform] ?? "🔗"} {item.label || item.url}
                        </a>
                        <button onClick={() => void handleDelete(item.id)} style={dangerBtnStyle}>
                          Delete
                        </button>
                      </div>
                      {item.notes ? (
                        <p style={{ margin: "0.4rem 0", fontSize: "0.8rem", opacity: 0.7 }}>{item.notes}</p>
                      ) : null}
                      {item.tags.length > 0 ? (
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                          {item.tags.map((tag) => (
                            <span key={tag} style={tagPillStyle}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.68rem", opacity: 0.35 }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
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
  marginBottom: "1.25rem",
};

const projectSectionStyle: React.CSSProperties = {
  marginBottom: "1.75rem",
  padding: "1.25rem",
  borderRadius: "0.9rem",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.02)",
};

const projectTitleStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  marginBottom: "0.85rem",
  paddingBottom: "0.6rem",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const formBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  padding: "0.9rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d0d",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  borderRadius: "0.6rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: "0.85rem",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem",
  borderRadius: "0.6rem",
  border: "none",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.88rem",
  cursor: "pointer",
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "0.35rem 0.7rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(250,65,65,0.4)",
  background: "rgba(250,65,65,0.1)",
  color: "#fa4141",
  fontSize: "0.72rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const rowStyle: React.CSSProperties = {
  padding: "0.75rem 0.9rem",
  borderRadius: "0.7rem",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d0d",
};

const tagPillStyle: React.CSSProperties = {
  fontSize: "0.68rem",
  padding: "0.2rem 0.55rem",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.7)",
};

const tagChipStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  padding: "0.35rem 0.7rem",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "transparent",
  color: "rgba(255,255,255,0.6)",
  cursor: "pointer",
};

function tagChipActiveStyle(accent: string): React.CSSProperties {
  return {
    ...tagChipStyle,
    background: accent,
    borderColor: accent,
    color: "#fff",
  };
}

const errorStyle: React.CSSProperties = {
  color: "#fa4141",
  fontSize: "0.82rem",
  marginBottom: "0.5rem",
};
