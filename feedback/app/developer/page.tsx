"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredUserId } from "@/lib/storage/client";
import type { ApiKey } from "@/lib/api-keys";

interface ApiKeyWithSecret extends ApiKey {
  secret?: string;
}

export default function DeveloperPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyWithSecret[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = typeof window !== "undefined" ? getStoredUserId() : null;

  const fetchKeys = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/keys?userId=${userId}`);
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function createKey() {
    if (!userId) return;
    const label = labelInput.trim() || "My API Key";
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/keys?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create key");
      setNewKey(data.key.secret);
      setLabelInput("");
      await fetchKeys();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!userId) return;
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await fetch(`/api/keys/${id}?userId=${userId}`, { method: "DELETE" });
      setKeys((k) => k.filter((key) => key.id !== id));
    } catch {
      setError("Failed to revoke key");
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="dev-page">
      <div className="dev-header">
        <button className="dev-back" onClick={() => router.back()}>← Back</button>
        <div>
          <h1 className="dev-title">Developer API</h1>
          <p className="dev-subtitle">Integrate Fightflo AI coaching into your own apps</p>
        </div>
        <Link href="/developer/docs" className="dev-docs-link">View Docs →</Link>
      </div>

      {newKey && (
        <div className="dev-secret-banner">
          <p className="dev-secret-label">Your new API key — copy it now, it won&apos;t be shown again</p>
          <div className="dev-secret-row">
            <code className="dev-secret-key">{newKey}</code>
            <button className="dev-copy-btn" onClick={() => copyKey(newKey)}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button className="dev-secret-dismiss" onClick={() => setNewKey(null)}>Done</button>
        </div>
      )}

      <section className="dev-section">
        <h2 className="dev-section-title">API Keys</h2>

        <div className="dev-create-row">
          <input
            className="dev-label-input"
            placeholder="Key label (e.g. Production)"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createKey()}
          />
          <button className="dev-create-btn" onClick={createKey} disabled={creating}>
            {creating ? "Creating…" : "+ New Key"}
          </button>
        </div>

        {error && <p className="dev-error">{error}</p>}

        {loading ? (
          <p className="dev-empty">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="dev-empty">No API keys yet. Create one above to get started.</p>
        ) : (
          <div className="dev-keys-list">
            {keys.map((k) => (
              <div className="dev-key-card" key={k.id}>
                <div className="dev-key-info">
                  <span className="dev-key-label">{k.label}</span>
                  <code className="dev-key-prefix">{k.key_prefix}••••••••••••••••••••••••</code>
                  <span className="dev-key-meta">
                    {k.call_count.toLocaleString()} calls ·{" "}
                    {k.last_used_at
                      ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}`
                      : "Never used"} ·{" "}
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button className="dev-revoke-btn" onClick={() => revokeKey(k.id)}>Revoke</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dev-section">
        <h2 className="dev-section-title">Quick Start</h2>
        <div className="dev-quickstart">
          <p className="dev-qs-step">1. Create an API key above</p>
          <p className="dev-qs-step">2. Send a video URL to the analyse endpoint</p>
          <pre className="dev-code-block">{`curl -X POST https://fightflo.app/api/v1/analyse \\
  -H "Authorization: Bearer ff_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"video_url":"https://...","sport":"boxing"}'`}</pre>
          <p className="dev-qs-step">3. Poll for results or provide a webhook URL</p>
          <Link href="/developer/docs" className="dev-fullocs-link">
            Full documentation →
          </Link>
        </div>
      </section>
    </main>
  );
}
