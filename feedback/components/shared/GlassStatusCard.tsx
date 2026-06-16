"use client";

interface GlassStatusCardProps {
  kicker?: string;
  title: string;
  message?: string;
  variant?: "default" | "error";
}

export function GlassStatusCard({
  kicker,
  title,
  message,
  variant = "default",
}: GlassStatusCardProps) {
  return (
    <div
      className={`glass-surface-card glass-status-card ${
        variant === "error" ? "glass-status-card--error" : ""
      }`}
    >
      {kicker ? <p className="loading-panel-kicker">{kicker}</p> : null}
      <h1 className="glass-greeting-title glass-status-card-title">{title}</h1>
      {message ? <p className="loading-panel-status">{message}</p> : null}
    </div>
  );
}
