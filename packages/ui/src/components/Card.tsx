import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[16px] border border-[var(--otv-border)] bg-[var(--otv-surface)] p-5",
        className
      )}
      {...props}
    />
  );
}
