import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
        variant === "primary" && "bg-[var(--otv-brand)] text-white hover:bg-[var(--otv-brand-hover)]",
        variant === "secondary" && "border border-[var(--otv-border)] bg-[var(--otv-surface)] text-[var(--otv-text-primary)] hover:border-[var(--otv-border-strong)]",
        variant === "ghost" && "text-[var(--otv-text-secondary)] hover:text-[var(--otv-text-primary)] hover:bg-[var(--otv-surface-muted)]",
        variant === "danger" && "bg-[var(--otv-danger)] text-white",
        className
      )}
      {...props}
    />
  );
}
