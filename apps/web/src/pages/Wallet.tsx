import { useState } from "react";
import type { Verdict } from "@otv/verdict-schema";
import { Alert, Button, Card, Input, StatusBadge } from "@otv/ui";
import { useAuth } from "@/lib/auth";

export function WalletPage() {
  const { client } = useAuth();
  const [tx, setTx] = useState("");
  const [recipient, setRecipient] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawSeen, setRawSeen] = useState(false);

  async function onCheck() {
    setRawSeen(true);
    setLoading(true);
    setError(null);
    try {
      const next = await client.verifyIncoming({
        chain: "ethereum",
        network: "sepolia",
        transactionHash: tx,
        recipient,
        asset: {
          type: "erc20",
          contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          symbol: "USDC",
          decimals: 6,
        },
      });
      setVerdict(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setVerdict(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="otv-container max-w-xl space-y-4 py-10">
        <Alert tone="info" title="Demo inbox, no custody">
          This screen is a stand-in for a wallet. It does not hold keys or send coins. Paste a hash a
          user might treat as paid, then see the verdict.
        </Alert>
        <Card>
          <h1 className="text-xl font-bold">Inbox</h1>
          <p className="mt-1 text-sm text-[var(--otv-text-secondary)]">
            Raw activity first. Then a spendability decision.
          </p>
          <div className="mt-4 space-y-3">
            <Input className="otv-mono" placeholder="Transaction hash" value={tx} onChange={(e) => setTx(e.target.value)} />
            <Input className="otv-mono" placeholder="Recipient address" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            <Button className="w-full" size="sm" type="button" disabled={loading || !tx || !recipient} onClick={() => void onCheck()}>
              {loading ? "Checking with OTV…" : "Verify incoming transfer"}
            </Button>
          </div>
        </Card>

        {error && (
          <Alert tone="danger" title="Could not verify">
            {error}
          </Alert>
        )}

        {rawSeen && (
          <Card>
            <div className="text-xs tracking-widest text-[var(--otv-warning)]">RAW CHAIN ACTIVITY</div>
            <p className="mt-2 text-sm">This hash exists. It is not yet a decision that funds can be spent.</p>
            <p className="otv-mono mt-2 text-xs text-[var(--otv-text-muted)]">
              {tx} → {recipient}
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
  );
}
