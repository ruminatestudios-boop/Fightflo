"use client";

interface ShadowGuardFlashProps {
  warning: "left" | "right" | "both" | null;
}

export function ShadowGuardFlash({ warning }: ShadowGuardFlashProps) {
  if (!warning) return null;

  if (warning === "left") {
    return (
      <div
        className="shadow-guard-flash shadow-guard-flash--left"
        aria-hidden
      />
    );
  }
  if (warning === "right") {
    return (
      <div
        className="shadow-guard-flash shadow-guard-flash--right"
        aria-hidden
      />
    );
  }
  return <div className="shadow-guard-flash shadow-guard-flash--both" aria-hidden />;
}
