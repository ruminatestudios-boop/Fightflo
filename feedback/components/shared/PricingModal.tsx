"use client";

import { useEffect, useState } from "react";
import { PRICING } from "@/config/pricing";

type PricingTier = "free" | "pro" | "topup";

interface PricingModalProps {
  open: boolean;
  isPro?: boolean;
  onClose: () => void;
  onSelectPro: () => void;
  onSelectTopUp: () => void;
}

const PRO_FEATURES = [
  `${PRICING.pro.scansPerMonth} analyses per month`,
  "Skeleton overlay download",
  "Clip playback & progress",
];

export function PricingModal({
  open,
  isPro = false,
  onClose,
  onSelectPro,
  onSelectTopUp,
}: PricingModalProps) {
  const [expanded, setExpanded] = useState<PricingTier | null>("pro");

  useEffect(() => {
    if (open) {
      setExpanded("pro");
    }
  }, [open]);

  if (!open) return null;

  const toggle = (tier: PricingTier) => {
    setExpanded((current) => (current === tier ? null : tier));
  };

  return (
    <div
      className="session-edit-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
    >
      <button
        type="button"
        className="session-edit-backdrop"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="session-edit-sheet">
        <div className="session-edit-handle" aria-hidden />
        <h2 id="pricing-modal-title" className="session-edit-title">
          Plans & pricing
        </h2>

        <div className="pricing-accordion">
          <div
            className={`pricing-accordion-item ${expanded === "free" ? "pricing-accordion-item--open" : ""}`}
          >
            <button
              type="button"
              className="pricing-accordion-trigger"
              aria-expanded={expanded === "free"}
              onClick={() => toggle("free")}
            >
              <span className="pricing-accordion-label">
                <span className="pricing-accordion-tier pricing-accordion-tier--free">
                  Free
                </span>
                <span className="pricing-accordion-price">£0</span>
              </span>
              <span className="pricing-accordion-chevron" aria-hidden />
            </button>
            <div className="pricing-accordion-panel">
              <div className="pricing-accordion-panel-inner">
                <p className="pricing-accordion-copy">
                  {PRICING.free.lifetimeScans} analysis · full coaching report
                </p>
                {!isPro && (
                  <span className="pricing-accordion-badge">Included</span>
                )}
              </div>
            </div>
          </div>

          <div
            className={`pricing-accordion-item pricing-accordion-item--featured ${expanded === "pro" ? "pricing-accordion-item--open" : ""}`}
          >
            <button
              type="button"
              className="pricing-accordion-trigger"
              aria-expanded={expanded === "pro"}
              onClick={() => toggle("pro")}
            >
              <span className="pricing-accordion-label">
                <span className="pricing-accordion-tier pricing-accordion-tier--pro">
                  Pro
                </span>
                <span className="pricing-accordion-price">
                  {PRICING.pro.displayMonthly}
                </span>
              </span>
              <span className="pricing-accordion-chevron" aria-hidden />
            </button>
            <div className="pricing-accordion-panel">
              <div className="pricing-accordion-panel-inner">
                <ul className="pricing-accordion-features">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {isPro ? (
                  <span className="pricing-accordion-badge pricing-accordion-badge--active">
                    Your plan
                  </span>
                ) : (
                  <button
                    type="button"
                    className="session-edit-save pricing-accordion-cta"
                    onClick={() => {
                      onClose();
                      onSelectPro();
                    }}
                  >
                    Go Pro
                  </button>
                )}
              </div>
            </div>
          </div>

          <div
            className={`pricing-accordion-item ${expanded === "topup" ? "pricing-accordion-item--open" : ""}`}
          >
            <button
              type="button"
              className="pricing-accordion-trigger"
              aria-expanded={expanded === "topup"}
              onClick={() => toggle("topup")}
            >
              <span className="pricing-accordion-label">
                <span className="pricing-accordion-tier">Top-up</span>
                <span className="pricing-accordion-price">
                  {PRICING.topUp.displayShort}
                </span>
              </span>
              <span className="pricing-accordion-chevron" aria-hidden />
            </button>
            <div className="pricing-accordion-panel">
              <div className="pricing-accordion-panel-inner">
                <p className="pricing-accordion-copy">
                  <span className="pricing-accordion-highlight">
                    +{PRICING.topUp.scans} analyses
                  </span>{" "}
                  when you hit your monthly cap
                </p>
                <p className="pricing-accordion-note">Pro subscribers only</p>
                <button
                  type="button"
                  className="session-edit-save pricing-accordion-cta"
                  disabled={!isPro}
                  onClick={() => {
                    if (!isPro) return;
                    onClose();
                    onSelectTopUp();
                  }}
                >
                  {isPro ? "Buy scan pack" : "Requires Pro"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="session-edit-actions">
          <button type="button" className="session-edit-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
