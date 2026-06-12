"use client";

interface LogoHeaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  align?: "left" | "center";
  /** Light text on dark video overlays */
  variant?: "dark" | "light";
}

const SIZE_CLASS = {
  sm: "text-lg tracking-[0.32em] sm:text-xl",
  md: "text-2xl tracking-[0.28em] sm:text-[1.65rem]",
  lg: "text-4xl tracking-[0.22em] sm:text-[2.5rem]",
};

/** Placeholder wordmark — swap for image logo later */
export function LogoHeader({
  size = "md",
  className = "",
  align = "left",
  variant = "dark",
}: LogoHeaderProps) {
  return (
    <div
      className={`flex ${align === "center" ? "w-full justify-center" : "justify-start"} ${className}`}
    >
      <span
        className={`font-display font-semibold ${SIZE_CLASS[size]} ${
          variant === "light" ? "text-white" : "text-white"
        }`}
      >
        FIGHTFLO
      </span>
    </div>
  );
}
