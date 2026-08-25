import type { EvidenceItem, Verdict } from "@otv/verdict-schema";
import { StatusBadge } from "./StatusBadge";
import { Card } from "./Card";
import { HashDisplay } from "./HashDisplay";

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs tracking-widest text-[var(--otv-text-muted)]">OTV VERDICT</div>
          <div className="mt-1 text-2xl font-bold">{verdict.status}</div>
          <div className="mt-1 text-xs text-[var(--otv-text-muted)]">
            confidence {(verdict.confidence * 100).toFixed(0)}% · {verdict.schema}
          </div>
        </div>
        <StatusBadge status={verdict.status} />
      </div>
      <div className="mt-4 space-y-3">
        <HashDisplay label="Transaction" value={verdict.transactionHash} />
        <HashDisplay label="Recipient" value={verdict.recipient} />
        <div className="flex justify-between text-sm">
          <span className="text-[var(--otv-text-muted)]">Asset</span>
          <span>{verdict.asset.symbol ?? "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--otv-text-muted)]">Finality</span>
          <span>{verdict.finality.state}</span>
        </div>
      </div>
    </Card>
  );
}

export function TransactionTrustPanel({
  verdict,
}: {
  verdict: Pick<Verdict, "status" | "evidence" | "finality" | "risk">;
}) {
  const rows: Array<{ label: string; type?: EvidenceItem["type"] }> = [
    { label: "Observed", type: "TRANSACTION_INCLUDED" },
    { label: "Executed", type: "EXECUTION_SUCCESS" },
    { label: "Asset", type: "ASSET_MATCH" },
    { label: "Recipient", type: "RECIPIENT_MATCH" },
    { label: "Balance", type: "BALANCE_DELTA" },
    { label: "Finality", type: "FINALITY" },
  ];
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-[var(--otv-text-secondary)]">
          OTV VERIFICATION
        </h3>
        <StatusBadge status={verdict.status} />
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => {
          const ev = verdict.evidence.find((e) => e.type === row.type);
          const ok = ev?.result === true;
          return (
            <li key={row.label} className="flex justify-between">
              <span className="text-[var(--otv-text-secondary)]">{row.label}</span>
              <span className={ok ? "text-[var(--otv-success)]" : "text-[var(--otv-text-muted)]"}>
                {ok ? "YES" : "NO"}
              </span>
            </li>
          );
        })}
        <li className="flex justify-between border-t border-[var(--otv-border)] pt-2 font-semibold">
          <span>VERDICT</span>
          <span>{verdict.status}</span>
        </li>
      </ul>
      <p className="mt-3 text-xs text-[var(--otv-text-muted)]">
        Raw blockchain data remains visible. OTV is an additive verification layer.
      </p>
    </Card>
  );
}

export function EvidenceTimeline({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <ol className="space-y-3 border-l border-[var(--otv-border)] pl-4">
      {evidence.map((item) => (
        <li key={item.type} className="relative">
          <span
            className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full"
            style={{
              background: item.result ? "var(--otv-success)" : "var(--otv-danger)",
            }}
            aria-hidden
          />
          <div className="text-sm font-medium">{item.type}</div>
          <div className="text-xs text-[var(--otv-text-muted)]">
            {item.result ? "PASS" : "FAIL"}
            {item.detail ? ` · ${item.detail}` : ""}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SignatureVerification({
  valid,
  kid,
}: {
  valid: boolean | null;
  kid?: string;
}) {
  return (
    <div
      className="rounded-[12px] border px-4 py-3 text-sm"
      style={{
        borderColor: valid ? "color-mix(in srgb, var(--otv-success) 40%, transparent)" : "var(--otv-border)",
      }}
      role="status"
    >
      <div className="font-semibold">
        Signature: {valid == null ? "unchecked" : valid ? "Valid" : "Invalid"}
      </div>
      {kid && <div className="otv-mono mt-1 text-xs text-[var(--otv-text-muted)]">kid={kid}</div>}
    </div>
  );
}
