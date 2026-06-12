"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const HEIGHT = {
  sm: 22,
  md: 32,
  lg: 44,
} as const;

export function Logo({ size = "lg", className = "" }: LogoProps) {
  const height = HEIGHT[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/fightflo-logo.png"
      alt="FightFlo"
      className={`mx-auto block object-contain object-center ${className}`}
      style={{ height, width: "auto", maxWidth: "min(100%, 240px)" }}
    />
  );
}
