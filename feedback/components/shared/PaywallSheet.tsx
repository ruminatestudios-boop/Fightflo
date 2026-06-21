"use client";

import { useState } from "react";
import { PRICING } from "@/config/pricing";
import { ModalShell } from "@/components/shared/ModalShell";
import type { ReportEmailStatus } from "@/hooks/useReportEmailCapture";

export type PaywallMode = "pro" | "topup";

interface PaywallSheetProps {
  open: boolean;
  mode: PaywallMode;
  onClose: () => void;
  onCheckout: () => void;
  bonusScans?: number;
  /** When the user has no email on file, "Maybe later" captures one before closing */
  hasEmail?: boolean;
  email?: string;
  onEmailChange?: (value: string) => void;
  emailStatus?: ReportEmailStatus;
  onEmailSubmit?: () => void;
}

export function PaywallSheet({
  open,
  mode,
  onClose,
  onCheckout,
  bonusScans = 0,
  hasEmail = true,
  email = "",
  onEmailChange,
  emailStatus = "idle",
  onEmailSubmit,
}: PaywallSheetProps) {
  const isTopUp = mode === "topup";
  const [view, setView] = useState<"main" | "email">("main");

  const handleMaybeLater = () => {
    if (!hasEmail && onEmailChange && onEmailSubmit) {
      setView("email");
      return;
    }
    onClose();
  };

  const handleClose = () => {
    setView("main");
    onClose();
  };

  if (view === "email") {
    return (
      <ModalShell
        open={open}
        onClose={handleClose}
        title="Before you go"
        accent="red"
        compact
        footer={
          <>
            <button
              type="button"
              onClick={onEmailSubmit}
              disabled={emailStatus === "submitting"}
              className="ff-primary-btn w-full"
            >
              {emailStatus === "submitting" ? "Sending…" : "Keep me posted"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full py-2 text-xs text-white/40"
            >
              No thanks
            </button>
          </>
        }
      >
        {emailStatus === "success" ? (
          <p className="loading-panel-status">
            Got it — we&apos;ll let you know about offers and when you&apos;re
            ready to go further.
          </p>
        ) : (
          <>
            <p className="loading-panel-status">
              Want offers or a reminder when you&apos;re ready to go further?
              Drop your email — no spam.
            </p>
            <label className="home-name-field mt-3">
              Email
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => onEmailChange?.(e.target.value)}
                disabled={emailStatus === "submitting"}
                className="home-name-input"
                aria-label="Email address"
              />
            </label>
            {emailStatus === "invalid" && (
              <p className="glass-error">Double check that email</p>
            )}
            {emailStatus === "error" && (
              <p className="glass-error">Something went wrong — try again</p>
            )}
          </>
        )}
      </ModalShell>
    );
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title={isTopUp ? "Need more scans?" : "Go Pro"}
      accent="red"
      compact
      footer={
        <>
          <button
            type="button"
            onClick={onCheckout}
            className="ff-primary-btn w-full"
          >
            {isTopUp ? "Buy scan pack" : "Upgrade now"}
          </button>
          <button
            type="button"
            onClick={handleMaybeLater}
            className="mt-3 w-full py-2 text-xs text-white/40"
          >
            Maybe later
          </button>
        </>
      }
    >
      <p className="loading-panel-status">
        {isTopUp ? (
          <>
            You&apos;ve used your {PRICING.pro.scansPerMonth} analyses this month
            {bonusScans > 0 ? ` (${bonusScans} bonus left)` : ""}. Add{" "}
            {PRICING.topUp.scans} more now, or wait until the 1st.
          </>
        ) : (
          <>
            {PRICING.pro.scansPerMonth} analyses per month, clip playback,
            watermarked video download & progress tracking.
          </>
        )}
      </p>
      <ul className="paywall-features">
        {isTopUp ? (
          <>
            <li>+{PRICING.topUp.scans} analyses added instantly</li>
            <li>Use anytime this month</li>
            <li>Stacks with your Pro allowance</li>
          </>
        ) : (
          <>
            <li>{PRICING.pro.scansPerMonth} analyses every month</li>
            <li>Download videos with skeleton overlay</li>
            <li>Clip playback, progress & history</li>
          </>
        )}
      </ul>
      <p className="glass-greeting-title glass-greeting-title--sm mt-4">
        {isTopUp ? (
          <>
            {PRICING.topUp.displayShort}
            <span className="text-sm text-white/40">
              {" "}
              for {PRICING.topUp.scans} scans
            </span>
          </>
        ) : (
          <>
            {PRICING.pro.displayMonthly.replace("/mo", "")}
            <span className="text-sm text-white/40">/mo</span>
          </>
        )}
      </p>
    </ModalShell>
  );
}
