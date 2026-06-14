"use client";

interface LogoHeaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  align?: "left" | "center";
  /** Light text on dark video overlays */
  variant?: "dark" | "light";
  onHome?: () => void;
}

const SIZE_CLASS = {
  sm: "text-lg tracking-[0.32em] sm:text-xl",
  md: "text-2xl tracking-[0.28em] sm:text-[1.65rem]",
  lg: "text-4xl tracking-[0.22em] sm:text-[2.5rem]",
};

export function LogoHeader({
  size = "md",
  className = "",
  align = "left",
  variant = "dark",
  onHome,
}: LogoHeaderProps) {
  const alignClass =
    align === "center" ? "w-full justify-center" : "justify-start";

  const wordmark = (
    <span
      className={`font-display font-semibold ${SIZE_CLASS[size]} ${
        variant === "light" ? "text-white" : "text-white"
      }`}
    >
      FIGHTFLO<span className="text-[#e6544e] tracking-[0]">.</span>
    </span>
  );

  if (!onHome) {
    return <div className={`flex ${alignClass} ${className}`}>{wordmark}</div>;
  }

  return (
    <button
      type="button"
      onClick={onHome}
      aria-label="Go to homepage"
      className={`flex ${alignClass} ${className} transition-opacity hover:opacity-80 active:opacity-65`}
    >
      {wordmark}
    </button>
  );
}
