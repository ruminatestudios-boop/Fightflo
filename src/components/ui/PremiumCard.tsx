"use client";

import type { ReactNode } from "react";

interface PremiumCardProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  dark?: boolean;
}

export function PremiumCard({
  children,
  onClick,
  selected = false,
  className = "",
  dark = false,
}: PremiumCardProps) {
  const base = onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : "";

  const styles = selected
    ? "nike-card-selected shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    : dark
      ? "nike-card shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      : "bg-[#f5f5f5] border border-[#e5e5e5] text-[#111111] shadow-[0_2px_12px_rgba(0,0,0,0.06)]";

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full rounded-2xl p-5 text-left ${styles} ${base} ${className}`}
    >
      {children}
    </Tag>
  );
}
