"use client";

import Link from "next/link";

interface LogoHeaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  align?: "left" | "center";
}

const SIZE_CLASS = {
  sm: "text-lg tracking-[0.32em] sm:text-xl",
  md: "text-2xl tracking-[0.28em] sm:text-[1.65rem]",
  lg: "text-4xl tracking-[0.22em] sm:text-[2.5rem]",
};

export function LogoHeader({
  size = "md",
  className = "",
  align = "center",
}: LogoHeaderProps) {
  const alignClass =
    align === "center" ? "w-full justify-center" : "justify-start";

  return (
    <Link
      href="/"
      className={`flex ${alignClass} ${className} no-underline transition-opacity hover:opacity-80 active:opacity-65`}
      aria-label="Fightflo home"
    >
      <span
        className={`font-display font-semibold text-white ${SIZE_CLASS[size]}`}
      >
        FIGHTFLO<span className="text-[#e6544e] tracking-[0]">.</span>
      </span>
    </Link>
  );
}
