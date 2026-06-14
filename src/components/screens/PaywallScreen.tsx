"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { grantStreakFreeze } from "@/lib/bag-drill/storage";
import { startCheckout } from "@/lib/pro-sync";
import {
  isPro,
  PLANS,
  PRO_FEATURES,
  setPaywallSeen,
  type SubscriptionPlan,
} from "@/lib/subscription";

const FREEZE_GRANTED_KEY = "fightflo-pro-freeze-granted";
import { Button } from "@/components/ui/Button";
import { AppTopBar } from "@/components/ui/AppTopBar";
import { PremiumCard } from "@/components/ui/PremiumCard";

interface PaywallScreenProps {
  onClose: () => void;
  onSubscribed?: () => void;
  showClose?: boolean;
  isPro?: boolean;
}

export function PaywallScreen({
  onClose,
  onSubscribed,
  showClose = true,
  isPro: isProProp = false,
}: PaywallScreenProps) {
  const [selected, setSelected] = useState<SubscriptionPlan>("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyPro = isProProp || isPro();

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    const url = await startCheckout(selected, "/");
    if (url) {
      window.location.href = url;
      return;
    }
    setError("Checkout unavailable. Check Stripe config or try again.");
    setLoading(false);
  };

  const handleSkip = () => {
    setPaywallSeen();
    onClose();
  };

  if (alreadyPro) {
    return (
      <div className="app-shell relative z-10 flex min-h-dvh flex-col bg-black px-5 pb-24 pt-10">
        <AppTopBar
          trailing={
            showClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center text-[#737373] hover:text-white"
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : undefined
          }
        />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-[#fa4141]/30 bg-[#fa4141]/10">
            <span className="font-display text-sm text-[#fa4141]">Pro</span>
          </div>
          <h1 className="font-display text-2xl tracking-wide text-white">You&apos;re on Pro</h1>
          <p className="mt-2 max-w-xs text-sm text-[#737373]">
            All rhythm modes, advanced signals, and premium ambience are unlocked.
          </p>
          <div className="mt-10 w-full">
            <Button variant="outline" size="md" onClick={onClose}>
              Back to training
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell relative z-10 flex min-h-dvh flex-col px-5 pb-24 pt-10">
      <AppTopBar
        trailing={
          showClose ? (
            <button
              type="button"
              onClick={handleSkip}
              className="flex h-10 w-10 items-center justify-center text-[#737373] transition-colors hover:text-white"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : undefined
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-1 flex-col"
      >
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="label text-[#fa4141]">Subscription</span>
        </div>

        <h1 className="text-center font-display text-[1.65rem] leading-[1.05] tracking-wide text-white">
          Sharper reactions.
          <br />
          Real fight pace.
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-center text-sm text-[#737373]">
          Train like sparring — pressure waves, silence, and explosive exchanges. Pro unlocks everything.
        </p>

        <ul className="mt-8 space-y-2">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-[#a3a3a3]">
              <span className="text-[#fa4141]">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-3">
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <PremiumCard
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                selected={isSelected}
                dark={isSelected}
                className={!isSelected ? "!bg-[#1a1a1a] !border-[#2a2a2a] !text-white" : ""}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {plan.badge && (
                      <span className="mb-2 inline-block rounded-md bg-[#fa4141] px-2 py-0.5 text-[10px] font-bold text-white">
                        {plan.badge}
                      </span>
                    )}
                    <p className="text-lg font-semibold">{plan.label}</p>
                    <p className="mt-1 text-2xl font-bold">
                      {plan.price}
                      <span className="ml-1 text-sm font-normal opacity-70">{plan.period}</span>
                    </p>
                    {plan.perMonth && (
                      <p className="mt-0.5 text-xs opacity-60">{plan.perMonth}</p>
                    )}
                  </div>
                  <div
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border-2 ${
                      isSelected ? "border-[#fa4141] bg-[#fa4141]" : "border-[#525252]"
                    }`}
                  >
                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                  </div>
                </div>
              </PremiumCard>
            );
          })}
        </div>

        <div className="mt-auto space-y-3 pt-8">
          <Button onClick={handleSubscribe} disabled={loading}>
            {loading ? "Opening checkout…" : "Go Pro — subscribe"}
          </Button>
          {error && (
            <p className="text-center text-xs text-[#fa4141]">{error}</p>
          )}
          <p className="text-center text-xs text-[#525252]">
            Recurring billing · Cancel anytime in Stripe
          </p>
          {showClose && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-sm text-[#737373] hover:text-white"
            >
              Maybe later
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
