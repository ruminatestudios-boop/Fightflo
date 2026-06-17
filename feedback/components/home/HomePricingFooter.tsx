"use client";

import { LegalFooter } from "@/components/shared/LegalFooter";

interface HomePricingFooterProps {
  onPlansClick: () => void;
}

export function HomePricingFooter({ onPlansClick }: HomePricingFooterProps) {
  return (
    <div className="home-pricing-footer">
      <button type="button" className="home-pricing-cta" onClick={onPlansClick}>
        See pricing packages
      </button>

      <LegalFooter />
    </div>
  );
}
