"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface FlowShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function FlowShell({ title, subtitle, children }: FlowShellProps) {
  return (
    <div className="glass-home-inner">
      <header className="glass-greeting">
        {subtitle ? <p className="glass-greeting-sub">{subtitle}</p> : null}
        <h1 className="glass-greeting-title glass-greeting-title--sm">{title}</h1>
      </header>
      {children}
    </div>
  );
}

interface FlowPanelProps {
  children: ReactNode;
  className?: string;
}

export function FlowPanel({ children, className = "" }: FlowPanelProps) {
  return <div className={`home-flow-panel ${className}`.trim()}>{children}</div>;
}

interface FlowActionProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function FlowAction({
  children,
  onClick,
  href,
  variant = "primary",
  disabled = false,
}: FlowActionProps) {
  const className = `home-flow-action home-flow-action--${variant}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function FlowEmpty({ message }: { message: string }) {
  return <p className="home-flow-empty">{message}</p>;
}
