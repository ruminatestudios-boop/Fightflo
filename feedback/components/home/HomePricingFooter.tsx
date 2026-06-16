"use client";

import { LegalFooter } from "@/components/shared/LegalFooter";
import { PRICING } from "@/config/pricing";

interface HomePricingFooterProps {
  demoLoading?: boolean;
  onSampleClick: () => void;
  onPlansClick: () => void;
}

export function HomePricingFooter({
  demoLoading = false,
  onSampleClick,
  onPlansClick,
}: HomePricingFooterProps) {
  return (
    <div className="home-pricing-footer">
      <button
        type="button"
        className="home-sample-link"
        onClick={onSampleClick}
        disabled={demoLoading}
      >
        {demoLoading ? "Loading sample…" : "Preview a sample report"}
      </button>

      <div className="home-pricing-summary">
        <p className="home-pricing-summary-lead">Start free · upgrade anytime</p>
        <dl className="home-pricing-rows">
          <div className="home-pricing-row">
            <dt>Free</dt>
            <dd>{PRICING.free.lifetimeScans} analysis</dd>
          </div>
          <div className="home-pricing-row">
            <dt>Pro</dt>
            <dd>
              {PRICING.pro.displayMonthly} · {PRICING.pro.scansPerMonth} scans/mo
            </dd>
          </div>
          <div className="home-pricing-row">
            <dt>Top-up</dt>
            <dd>
              {PRICING.topUp.displayShort} · {PRICING.topUp.scans} scans
            </dd>
          </div>
        </dl>
        <button type="button" className="home-pricing-cta" onClick={onPlansClick}>
          Compare plans
        </button>
      </div>

      <LegalFooter />
    </div>
  );
}
