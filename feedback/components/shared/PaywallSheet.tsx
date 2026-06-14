"use client";

import { PRICING } from "@/config/pricing";

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
  if (!open) return null;

  const isTopUp = mode === "topup";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4">
      <div className="w-full rounded-[1.25rem] border border-white/10 bg-[#141414] p-6">
        <h2 className="text-lg font-medium">
          {isTopUp ? "Need more scans?" : "Go Pro"}
        </h2>
        <p className="mt-2 text-sm text-white/45">
          {isTopUp ? (
            <>
              You&apos;ve used your {PRICING.pro.scansPerMonth} analyses this
              month
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
        <p className="mt-4 text-2xl font-medium">
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
        <button
          type="button"
          onClick={onCheckout}
          className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-6 py-4 font-medium text-black"
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
      </div>
    </div>
  );
}
