import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  lift = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { lift?: boolean }) {
  return <div className={clsx("otv-card", lift && "otv-card-lift", className)} {...props} />;
}
