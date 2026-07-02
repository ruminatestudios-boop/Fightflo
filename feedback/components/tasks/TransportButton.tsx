interface TransportButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "active" | "destructive";
  size?: "default" | "lg" | "xl";
}

export function TransportButton({
  variant = "default",
  size = "default",
  className = "",
  ...props
}: TransportButtonProps) {
  const base = "inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-40 disabled:pointer-events-none";
  const sizeClass = size === "xl" ? "h-28 w-28" : size === "lg" ? "h-20 w-20" : "h-11 w-11";
  const variantClass =
    variant === "active"
      ? "bg-[var(--accent-red)] text-white hover:brightness-110"
      : variant === "destructive"
        ? "bg-[var(--surface-pill)] text-[var(--accent-red)] hover:bg-[var(--surface-raised)]"
        : "bg-[var(--surface-pill)] text-[var(--foreground)] hover:bg-[var(--surface-raised)]";

  return (
    <button
      type="button"
      className={`${base} ${sizeClass} ${variantClass} ${className}`.trim()}
      {...props}
    />
  );
}
