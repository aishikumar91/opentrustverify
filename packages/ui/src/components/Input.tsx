import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-[12px] border border-[var(--otv-border)] bg-[var(--otv-surface-muted)] px-3 py-2.5 text-sm text-[var(--otv-text-primary)] placeholder:text-[var(--otv-text-muted)]",
        className
      )}
      {...props}
    />
  );
}
