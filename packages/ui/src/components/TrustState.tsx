import { StatusBadge } from "./StatusBadge";
import type { EvidenceItem, VerificationStatus } from "@otv/verdict-schema";

const STEPS = [
  "OBSERVED",
  "EXECUTED",
  "ASSET_CONFIRMED",
  "BALANCE_CONFIRMED",
  "FINAL",
  "SPENDABLE",
] as const;

function stepLabel(s: string) {
  return s.replaceAll("_", " ");
}

export function TrustState({
  status,
  evidence,
}: {
  status: VerificationStatus | string;
  evidence?: EvidenceItem[];
}) {
  return (
    <div className="rounded-[16px] border border-[var(--otv-border)] bg-[var(--otv-surface)] p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-[var(--otv-text-secondary)]">VERIFICATION</h3>
        <StatusBadge status={status} />
      </div>
      <ul className="space-y-3">
        {STEPS.map((step) => {
          const ev = evidence?.find((e) => {
            const map: Record<string, string> = {
              OBSERVED: "TRANSACTION_INCLUDED",
              EXECUTED: "EXECUTION_SUCCESS",
              ASSET_CONFIRMED: "ASSET_MATCH",
              BALANCE_CONFIRMED: "BALANCE_DELTA",
              FINAL: "FINALITY",
              SPENDABLE: "SPENDABILITY",
            };
            return e.type === map[step];
          });
          const ok = ev?.result === true || status === "SPENDABLE";
          return (
            <li key={step} className="flex items-center justify-between text-sm">
              <span className="text-[var(--otv-text-secondary)]">{stepLabel(step)}</span>
              <span className={ok ? "text-[var(--otv-success)]" : "text-[var(--otv-text-muted)]"} aria-label={ok ? "yes" : "no"}>
                {ok ? "✓" : "·"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-[var(--otv-border)] pt-4 text-center text-lg font-bold tracking-[0.18em] text-[var(--otv-brand)]">
        {String(status)}
      </div>
    </div>
  );
}
