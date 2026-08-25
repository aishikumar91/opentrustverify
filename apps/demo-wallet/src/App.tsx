import { useState } from "react";
import { OpenTrustVerify } from "@otv/sdk-core";
import type { Verdict } from "@otv/verdict-schema";
import { Alert, Button, Card, Logo, StatusBadge } from "@otv/ui";

const API_BASE = import.meta.env.VITE_OTV_API_URL ?? "http://localhost:4080";
const DEMO_KEY = import.meta.env.VITE_OTV_API_KEY ?? "otv_test_demo_key_change_me";

/**
 * Demo wallet — NO custody.
 * Simulates notifications and shows verified vs raw activity.
 */
export default function App() {
  const [rawSeen, setRawSeen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);

  async function simulateIncoming() {
    setRawSeen(true);
    setLoading(true);
    try {
      const otv = new OpenTrustVerify({ baseUrl: API_BASE, apiKey: DEMO_KEY });
      const result = await otv.verifyIncomingTransfer({
        chain: "ethereum",
        network: "sepolia",
        transactionHash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
        recipient: "0x2222222222222222222222222222222222222222",
        asset: {
          type: "erc20",
          contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          symbol: "USDC",
        },
        expectedAmount: "1000000",
      });
      setVerdict(result.verdict);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--otv-border)]">
        <div className="otv-container flex h-16 items-center justify-between">
          <Logo href="http://localhost:4083/" />
          <span className="text-xs tracking-widest text-[var(--otv-text-muted)]">DEMO WALLET</span>
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
          <Card className="animate-[fadeUp_400ms_var(--otv-ease)]">
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
          <Card className="animate-[fadeUp_500ms_var(--otv-ease)]">
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
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </main>
    </div>
  );
}
