"use client";

interface ReportEmailCaptureProps {
  email: string;
  onEmailChange: (value: string) => void;
  status: "idle" | "submitting" | "success" | "invalid" | "error";
  onSubmit: () => void;
  onDismiss?: () => void;
  mainFinding?: string;
}

export function ReportEmailCapture({
  email,
  onEmailChange,
  status,
  onSubmit,
  onDismiss,
  mainFinding,
}: ReportEmailCaptureProps) {
  if (status === "success") {
    return (
      <div className="rounded-[1.25rem] border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
        <p className="text-sm font-medium text-white">Check your inbox 👊</p>
        <p className="mt-2 text-xs text-white/50">
          We sent your report link{mainFinding ? ` — ${mainFinding}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-[#141414] p-5">
      <p className="text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
        Get notified
      </p>
      <h3 className="mt-2 text-lg font-medium text-white">
        Email me when my report is ready
      </h3>
      <p className="mt-2 text-sm text-white/45">
        Link to this breakdown plus your main finding — no spam.
      </p>

      <div className="mt-4 space-y-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={status === "submitting"}
          className="h-12 w-full rounded-card border border-white/10 bg-black px-4 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          aria-label="Email address"
        />

        <button
          type="button"
          onClick={onSubmit}
          disabled={status === "submitting"}
          className="flex h-12 w-full items-center justify-center rounded-card bg-white text-sm font-medium text-black disabled:opacity-50"
        >
          {status === "submitting" ? "Sending…" : "Send my report link"}
        </button>

        {status === "invalid" && (
          <p className="text-center text-xs text-[#fa4141]">
            Double check that email
          </p>
        )}
        {status === "error" && (
          <p className="text-center text-xs text-[#fa4141]">
            Something went wrong — try again
          </p>
        )}

        {onDismiss && status !== "submitting" && (
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-1 text-xs text-white/35"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
