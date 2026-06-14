"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { FLOWBAG_PLANS, type SubscriptionPlan } from "@/lib/subscription";
import { startCheckout } from "@/lib/pro-sync";

interface UpgradeModalProps {
  sessionsUsed: number;
  onClose: () => void;
}

export function UpgradeModal({ sessionsUsed, onClose }: UpgradeModalProps) {
  const [plan, setPlan] = useState<SubscriptionPlan>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = FLOWBAG_PLANS.find((p) => p.id === plan) ?? FLOWBAG_PLANS[0];

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    const url = await startCheckout(plan);
    if (url) {
      window.location.href = url;
      return;
    }
    setError("Checkout unavailable — try again shortly.");
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-white/40 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>

        <p className="text-xs uppercase tracking-[0.2em] text-[#fa4141]">
          {sessionsUsed} of 5 free sessions today
        </p>
        <h2 className="font-display mt-3 text-2xl tracking-wide text-white">
          You&apos;re on a roll. Don&apos;t stop now.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#737373]">
          {BAG_COPY.upgradeBody}
        </p>

        <div className="mt-6 flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {FLOWBAG_PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium uppercase tracking-[0.1em] transition-colors ${
                plan === p.id
                  ? "bg-[#fa4141] text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {selected.badge && (
          <p className="mt-3 text-center text-xs text-emerald-400/90">
            {selected.badge}
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleCheckout}
          className="mt-6 w-full rounded-xl bg-[#fa4141] py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
        >
          {loading
            ? "Opening checkout…"
            : plan === "monthly"
              ? "Go Pro — $9.99/mo"
              : "Go Pro — $79/yr"}
        </button>

        {error && (
          <p className="mt-3 text-center text-xs text-[#fa4141]">{error}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 text-xs text-white/40 hover:text-white/60"
        >
          Maybe later
        </button>
      </motion.div>
    </div>
  );
}
