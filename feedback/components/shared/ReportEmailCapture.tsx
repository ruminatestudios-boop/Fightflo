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
      <div className="glass-surface-card glass-inline-card glass-inline-card--success">
        <p className="glass-greeting-sub">Email sent</p>
        <h3 className="glass-greeting-title glass-greeting-title--sm">
          Check your inbox
        </h3>
        <p className="loading-panel-status">
          We sent your report link{mainFinding ? ` — ${mainFinding}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-surface-card glass-inline-card">
      <p className="loading-panel-kicker">Get notified</p>
      <h3 className="glass-greeting-title glass-greeting-title--sm">
        Email me when my report is ready
      </h3>
      <p className="loading-panel-status">
        Link to this breakdown plus your main finding — no spam.
      </p>

      <div className="glass-inline-card-form">
        <label className="home-name-field">
          Email
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={status === "submitting"}
            className="home-name-input"
            aria-label="Email address"
          />
        </label>

        <button
          type="button"
          onClick={onSubmit}
          disabled={status === "submitting"}
          className="ff-primary-btn w-full"
        >
          {status === "submitting" ? "Sending…" : "Send my report link"}
        </button>

        {status === "invalid" && (
          <p className="glass-error">Double check that email</p>
        )}
        {status === "error" && (
          <p className="glass-error">Something went wrong — try again</p>
        )}

        {onDismiss && status !== "submitting" && (
          <button type="button" className="home-sample-link" onClick={onDismiss}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
