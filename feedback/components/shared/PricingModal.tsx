"use client";

import { PRICING } from "@/config/pricing";
import { ModalShell } from "@/components/shared/ModalShell";

interface PricingModalProps {
  open: boolean;
  isPro?: boolean;
  onClose: () => void;
  onCheckout: (plan: "pro_monthly" | "topup") => void;
}

const PRO_FEATURES = [
  "Skeleton overlay download",
  "Clip playback & progress",
];

export function PricingModal({
  open,
  isPro = false,
  onClose,
  onCheckout,
}: PricingModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Plans & pricing"
      titleId="pricing-modal-title"
      accent="neutral"
      compact
    >
      <div className="pricing-plans">
        {/* Free */}
        <article className="pricing-plan-card">
          <header className="pricing-plan-card-head">
            <div className="pricing-plan-card-copy">
              <h3 className="pricing-plan-card-name">Free</h3>
              <p className="pricing-plan-card-desc">
                {PRICING.free.lifetimeScans} analysis · full coaching report
              </p>
            </div>
            <span className="pricing-plan-card-price">£0</span>
          </header>
          {!isPro ? (
            <p className="pricing-plan-card-status pricing-plan-card-status--active">
              Your current plan
            </p>
          ) : null}
        </article>

        {/* Pro */}
        <article className="pricing-plan-card pricing-plan-card--featured">
          <header className="pricing-plan-card-head">
            <div className="pricing-plan-card-copy">
              <h3 className="pricing-plan-card-name">Pro</h3>
              <p className="pricing-plan-card-desc">
                {PRICING.pro.scansPerMonth} analyses per month
              </p>
            </div>
            <span className="pricing-plan-card-price">{PRICING.pro.displayMonthly}</span>
          </header>
          <ul className="pricing-plan-card-features">
            {PRO_FEATURES.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          {isPro ? (
            <p className="pricing-plan-card-status pricing-plan-card-status--active">
              Your current plan
            </p>
          ) : (
            <button
              type="button"
              className="pricing-plan-cta"
              onClick={() => { onClose(); onCheckout("pro_monthly"); }}
            >
              Upgrade to Pro
            </button>
          )}
        </article>

        {/* Top-up */}
        <article className="pricing-plan-card">
          <header className="pricing-plan-card-head">
            <div className="pricing-plan-card-copy">
              <h3 className="pricing-plan-card-name">Top-up</h3>
              <p className="pricing-plan-card-desc">
                +{PRICING.topUp.scans} scans when you hit your monthly cap
              </p>
            </div>
            <span className="pricing-plan-card-price">{PRICING.topUp.displayShort}</span>
          </header>
          <p className="pricing-plan-card-note">Pro subscribers only</p>
          <button
            type="button"
            className="pricing-plan-cta"
            disabled={!isPro}
            onClick={() => { if (!isPro) return; onClose(); onCheckout("topup"); }}
          >
            {isPro ? "Buy scan pack" : "Requires Pro"}
          </button>
        </article>
      </div>
    </ModalShell>
  );
}
