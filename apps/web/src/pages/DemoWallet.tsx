import { useState } from "react";
import { Link } from "react-router-dom";
import type { Verdict } from "@otv/verdict-schema";
import { Alert, Button, Card, Logo, StatusBadge } from "@otv/ui";
import { DEMO_CLAIM, verifyIncoming } from "@/lib/otv";

export function DemoWalletPage() {
  const [rawSeen, setRawSeen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);

  async function simulateIncoming() {
    setRawSeen(true);
    setLoading(true);
    try {
      const result = await verifyIncoming(DEMO_CLAIM);
      setVerdict(result.verdict);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--otv-border)]">
        <div className="otv-container flex h-16 items-center justify-between">
          <Logo href="/" />
          <div className="flex items-center gap-3">
            <Link to="/verifier" className="text-sm text-[var(--otv-text-secondary)]">
              Verifier
            </Link>
            <span className="text-xs tracking-widest text-[var(--otv-text-muted)]">DEMO WALLET</span>
          </div>
        </div>
      </header>
      <main className="otv-container max-w-xl space-y-4 py-10">
        <Alert tone="info" title="No custody">
          This wallet demonstrates OTV integration only. It does not store private keys or send transactions.
        </Alert>
        <Card>
          <h1 className="text-xl font-bold">Inbox</h1>
          <p className="mt-1 text-sm text-[var(--otv-text-secondary)]">
            Compare raw blockchain activity with an OTV signed verdict.
          </p>
          <Button className="mt-6 w-full" type="button" disabled={loading} onClick={simulateIncoming}>
            {loading ? "Checking with OTV…" : "Simulate incoming transfer"}
          </Button>
        </Card>

        {rawSeen && (
          <Card>
            <div className="text-xs tracking-widest text-[var(--otv-warning)]">RAW CHAIN ACTIVITY</div>
            <p className="mt-2 text-sm">Incoming USDC event observed on explorer-like feed.</p>
            <p className="otv-mono mt-2 text-xs text-[var(--otv-text-muted)]">
              0xdemo…0001 → 0x2222…2222 · 1.000000 USDC
            </p>
            <p className="mt-3 text-sm text-[var(--otv-text-secondary)]">
              Alone, this can be socially engineered as “money arrived.”
            </p>
          </Card>
        )}

        {verdict && (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs tracking-widest text-[var(--otv-brand)]">OTV VERIFICATION</div>
              <StatusBadge status={verdict.status} />
            </div>
            <p className="mt-3 text-lg font-semibold">
              {verdict.status === "SPENDABLE"
                ? "Funds look spendable for this recipient."
                : `Status: ${verdict.status}`}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--otv-text-secondary)]">
              {verdict.evidence.map((e) => (
                <li key={e.type} className="flex justify-between">
                  <span>{e.type}</span>
                  <span>{e.result ? "YES" : "NO"}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}
