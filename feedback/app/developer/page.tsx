"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStoredUserId } from "@/lib/storage/client";
import { PRICING } from "@/config/pricing";
import type { ApiKey } from "@/lib/api-keys";

interface ApiKeyWithSecret extends ApiKey {
  secret?: string;
}

function DeveloperPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keys, setKeys] = useState<ApiKeyWithSecret[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [buyingPlan, setBuyingPlan] = useState<"api_credits_starter" | "api_credits_growth" | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsBanner, setCreditsBanner] = useState<"success" | "cancel" | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getStoredUserId());
  }, []);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [keysRes, creditsRes] = await Promise.all([
        fetch(`/api/keys?userId=${userId}`),
        fetch(`/api/user/credits?userId=${userId}`),
      ]);
      const keysData = await keysRes.json();
      const creditsData = await creditsRes.json();
      setKeys(keysData.keys ?? []);
      setCredits(creditsData.credits ?? 0);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
    const banner = searchParams.get("credits");
    if (banner === "success" || banner === "cancel") setCreditsBanner(banner as "success" | "cancel");
  }, [fetchData, searchParams]);

  async function buyCredits(plan: "api_credits_starter" | "api_credits_growth") {
    if (!userId) return;
    setBuyingPlan(plan);
    try {
      const res = await fetch("https://feedback.fightflo.app/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Failed to start checkout");
    } finally {
      setBuyingPlan(null);
    }
  }

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
      await fetchData();
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
        <button className="dev-back" onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="dev-title">Developer API</h1>
          <p className="dev-subtitle">Integrate Fightflo AI coaching into your own apps</p>
        </div>
      </div>

      {creditsBanner === "success" && (
        <div className="dev-credits-banner dev-credits-banner--success">Credits added — ready to use</div>
      )}
      {creditsBanner === "cancel" && (
        <div className="dev-credits-banner dev-credits-banner--cancel">Purchase cancelled</div>
      )}

      <div className="dev-credits-balance">
        <span className="dev-credits-balance-label">Credits remaining</span>
        <span className="dev-credits-balance-count">{credits === null ? "—" : credits.toLocaleString()}</span>
      </div>

      <div className="dev-packs">
        <div className="dev-pack">
          <div className="dev-pack-info">
            <span className="dev-pack-name">Starter</span>
            <span className="dev-pack-calls">{PRICING.apiCreditsStarter.calls} calls</span>
            <span className="dev-pack-per">{PRICING.apiCreditsStarter.perCall}/call</span>
          </div>
          <div className="dev-pack-right">
            <span className="dev-pack-price">{PRICING.apiCreditsStarter.displayShort}</span>
            <button className="dev-buy-btn" onClick={() => buyCredits("api_credits_starter")} disabled={buyingPlan !== null}>
              {buyingPlan === "api_credits_starter" ? "…" : "Buy"}
            </button>
          </div>
        </div>

        <div className="dev-pack dev-pack--featured">
          <div className="dev-pack-badge">Best value</div>
          <div className="dev-pack-info">
            <span className="dev-pack-name">Growth</span>
            <span className="dev-pack-calls">{PRICING.apiCreditsGrowth.calls} calls</span>
            <span className="dev-pack-per">{PRICING.apiCreditsGrowth.perCall}/call</span>
          </div>
          <div className="dev-pack-right">
            <span className="dev-pack-price">{PRICING.apiCreditsGrowth.displayShort}</span>
            <button className="dev-buy-btn dev-buy-btn--featured" onClick={() => buyCredits("api_credits_growth")} disabled={buyingPlan !== null}>
              {buyingPlan === "api_credits_growth" ? "…" : "Buy"}
            </button>
          </div>
        </div>
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
                    {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : "Never used"} ·{" "}
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
        </div>
      </section>

      <div className="dev-docs-cta">
        <Link href="/developer/docs" className="dev-docs-cta-btn">View Full Documentation</Link>
      </div>
    </main>
  );
}

export default function DeveloperPage() {
  return (
    <Suspense>
      <DeveloperPageInner />
    </Suspense>
  );
}
