"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "lg" | "md" | "sm";
  className?: string;
  disabled?: boolean;
}

const sizes = {
  lg: "h-14 px-8 text-[13px]",
  md: "h-12 px-6 text-[12px]",
  sm: "h-10 px-5 text-[11px]",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  className = "",
  disabled = false,
}: ButtonProps) {
  const base =
    "font-display inline-flex w-full cursor-pointer items-center justify-center rounded-full tracking-[0.14em] transition-colors duration-200 disabled:opacity-40";

  const variants = {
    primary: `${base} bg-white text-black hover:bg-[#e8e8e8] active:bg-[#d4d4d4]`,
    secondary: `${base} bg-[#fa4141] text-white hover:bg-[#e83b3b] active:bg-[#d63535]`,
    ghost: `${base} bg-transparent text-[#8e9297] hover:text-white`,
    outline: `${base} border border-white/[0.12] bg-transparent text-white hover:border-white/[0.22] hover:bg-white/[0.03]`,
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.985 }}
      transition={{ duration: 0.15 }}
      style={{ touchAction: "manipulation" }}
      className={`${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
