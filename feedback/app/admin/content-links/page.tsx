"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface ContentLink {
  id: string;
  url: string;
  platform: string;
  label: string | null;
  tags: string[];
  notes: string | null;
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

export default function ContentLinksAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<ContentLink[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [filterTag, setFilterTag] = useState<string | null>(null);

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

  const handleSave = useCallback(async () => {
    if (!url.trim()) {
      setError("Paste a link first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/content-links", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ url, label, tags, notes }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setUrl("");
      setLabel("");
      setTagsInput("");
      setNotes("");
      await fetchItems(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [url, label, tagsInput, notes, secret, fetchItems]);

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

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!filterTag) return items;
    return items.filter((item) => item.tags.includes(filterTag));
  }, [items, filterTag]);

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
      <div style={{ ...cardStyle, maxWidth: "680px" }}>
        <h1 style={titleStyle}>Content swipe file</h1>
        <p style={subStyle}>Paste a TikTok/IG/etc link, label it, tag it, come back later.</p>

        <div style={formBoxStyle}>
          <input
            type="text"
            placeholder="Paste link here (TikTok, IG, YouTube...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Label (e.g. 'good hook style')"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Tags, comma separated (e.g. hook, transition, voiceover)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ ...inputStyle, resize: "vertical" as const }}
            rows={2}
          />
          {error ? <p style={errorStyle}>{error}</p> : null}
          <button onClick={() => void handleSave()} disabled={saving} style={primaryBtnStyle}>
            {saving ? "Saving…" : "Save link"}
          </button>
        </div>

        {allTags.length > 0 ? (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "1.25rem 0 0.5rem" }}>
            <button
              onClick={() => setFilterTag(null)}
              style={filterTag === null ? tagChipActiveStyle : tagChipStyle}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                style={filterTag === tag ? tagChipActiveStyle : tagChipStyle}
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
  background: "#fa4141",
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

const tagChipActiveStyle: React.CSSProperties = {
  ...tagChipStyle,
  background: "#fa4141",
  borderColor: "#fa4141",
  color: "#fff",
};

const errorStyle: React.CSSProperties = {
  color: "#fa4141",
  fontSize: "0.82rem",
};
