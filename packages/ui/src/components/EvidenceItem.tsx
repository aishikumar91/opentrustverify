import type { EvidenceItem as Evidence } from "@otv/verdict-schema";

export function EvidenceItemView({ item }: { item: Evidence }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--otv-border)] py-3 last:border-0">
      <div>
        <div className="text-sm font-medium">{item.type}</div>
        {item.detail && <div className="otv-mono text-xs text-[var(--otv-text-muted)]">{item.detail}</div>}
      </div>
      <span className={item.result ? "text-[var(--otv-success)]" : "text-[var(--otv-danger)]"}>
        {item.result ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}
