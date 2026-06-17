"use client";

import { LegalFooter } from "@/components/shared/LegalFooter";

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

      <button type="button" className="home-pricing-cta" onClick={onPlansClick}>
        See pricing packages
      </button>

      <LegalFooter />
    </div>
  );
}
