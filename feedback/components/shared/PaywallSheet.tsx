"use client";

import { PRICING } from "@/config/pricing";
import { ModalShell } from "@/components/shared/ModalShell";

export type PaywallMode = "pro" | "topup";

interface PaywallSheetProps {
  open: boolean;
  mode: PaywallMode;
  onClose: () => void;
  onCheckout: () => void;
  bonusScans?: number;
}

export function PaywallSheet({
  open,
  mode,
  onClose,
  onCheckout,
  bonusScans = 0,
}: PaywallSheetProps) {
  const isTopUp = mode === "topup";

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={isTopUp ? "Need more scans?" : "Go Pro"}
      accent="red"
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
            onClick={onClose}
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
