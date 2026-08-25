import { StatusBadge } from "./StatusBadge";
import type { VerificationStatus } from "@otv/verdict-schema";
import { clsx } from "clsx";

/** Compact explorer badge shown beside raw chain data. */
export function VerificationBadge({
  status,
  compact = false,
}: {
  status: VerificationStatus | string;
  compact?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2",
        compact ? "text-xs" : "text-sm"
      )}
      aria-label={`OTV verification status: ${status}`}
    >
      <span className="font-semibold tracking-wide text-[var(--otv-brand)]">OTV</span>
      <StatusBadge status={status} />
    </span>
  );
}
