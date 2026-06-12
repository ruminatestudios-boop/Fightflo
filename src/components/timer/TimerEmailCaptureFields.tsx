"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { EmailCaptureStatus } from "@/hooks/useTimerEmailCapture";

interface TimerEmailCaptureFieldsProps {
  email: string;
  onEmailChange: (value: string) => void;
  status: EmailCaptureStatus;
  onSubmit: () => void;
  onFocus?: () => void;
  compact?: boolean;
  ctaLabel?: string;
}

export function TimerEmailCaptureFields({
  email,
  onEmailChange,
  status,
  onSubmit,
  onFocus,
  compact = false,
  ctaLabel = "Get Free FlowBag Access →",
}: TimerEmailCaptureFieldsProps) {
  const inputClass = compact
    ? "h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 text-xs text-white placeholder:text-white/30 focus:border-[#ff0000]/50 focus:outline-none"
    : "h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white placeholder:text-white/30 focus:border-[#ff0000]/50 focus:outline-none";

  if (status === "success") {
    return (
      <div className="text-center">
        <p className="font-display text-xl tracking-wide text-white">
          You&apos;re in 👊
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#a3a3a3]">
          Check your email for free FlowBag access
        </p>
        <div className="mt-6">
          <Link href="/bag" className="block">
            <Button variant="secondary">Try FlowBag now →</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="text-center">
        <p className="text-sm text-white">Check your inbox 📬</p>
        <div className="mt-4">
          <Link href="/bag" className="block">
            <Button variant="secondary" size={compact ? "sm" : "lg"}>
              Try FlowBag now →
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-3"}>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        onFocus={onFocus}
        disabled={status === "submitting"}
        className={inputClass}
        aria-label="Email address"
      />

      {compact ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={status === "submitting"}
          className="shrink-0 rounded-lg bg-[#ff0000] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-50"
        >
          {status === "submitting" ? "…" : "Get Access"}
        </button>
      ) : (
        <>
          <Button
            variant="secondary"
            onClick={onSubmit}
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Sending…" : ctaLabel}
          </Button>
          <p className="text-center text-[10px] text-[#525252]">
            No spam. Just training.
          </p>
        </>
      )}

      {status === "invalid" && (
        <p className={compact ? "absolute top-full mt-1 text-[10px] text-[#ff0000]" : "text-center text-xs text-[#ff0000]"}>
          Double check that email
        </p>
      )}
      {status === "error" && (
        <p className={compact ? "text-[10px] text-[#ff0000]" : "text-center text-xs text-[#ff0000]"}>
          Something went wrong —{" "}
          <Link href="/bag" className="underline">
            try fightflo.app/bag directly
          </Link>
        </p>
      )}
    </div>
  );
}
