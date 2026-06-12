"use client";

export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-[#fa4141]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#fa4141] ${className}`}
    >
      Pro
    </span>
  );
}
