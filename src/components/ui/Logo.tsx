"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  onHome?: () => void;
}

const HEIGHT = {
  sm: 22,
  md: 32,
  lg: 44,
} as const;

export function Logo({ size = "lg", className = "", onHome }: LogoProps) {
  const height = HEIGHT[size];

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/fightflo-logo.png"
      alt="fightflo"
      className={`mx-auto block object-contain object-center ${className}`}
      style={{ height, width: "auto", maxWidth: "min(100%, 240px)" }}
    />
  );

  if (!onHome) return image;

  return (
    <button
      type="button"
      onClick={onHome}
      aria-label="Go to homepage"
      className={`transition-opacity hover:opacity-80 active:opacity-65 ${className}`}
    >
      {image}
    </button>
  );
}
