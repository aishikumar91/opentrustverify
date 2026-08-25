import { clsx } from "clsx";
import type { VerificationStatus } from "@otv/verdict-schema";
import { statusTokens } from "@otv/design-tokens";

export function StatusBadge({ status }: { status: VerificationStatus | string }) {
  const token = statusTokens[status as VerificationStatus];
  const label = token?.label ?? status;
  const color = token?.color ?? "#a1a1aa";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-[8px] border px-2.5 py-1 text-xs font-semibold tracking-wide"
      )}
      style={{ borderColor: `${color}55`, color, background: `${color}14` }}
      role="status"
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
      {label}
    </span>
  );
}
