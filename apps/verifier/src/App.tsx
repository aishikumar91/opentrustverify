import { useState } from "react";
import { OpenTrustVerify } from "@otv/sdk-core";
import type { Verdict } from "@otv/verdict-schema";
import {
  Alert,
  Button,
  Card,
  EvidenceItemView,
  HashDisplay,
  Input,
  Logo,
  StatusBadge,
  TrustState,
} from "@otv/ui";

const API_BASE = import.meta.env.VITE_OTV_API_URL ?? "http://localhost:4080";
const DEMO_KEY = import.meta.env.VITE_OTV_API_KEY ?? "otv_test_demo_key_change_me";

const DEMO = {
  chain: "ethereum",
  network: "sepolia",
  transactionHash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
  recipient: "0x2222222222222222222222222222222222222222",
  assetContract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  expectedAmount: "1000000",
};

export default function App() {
  const [chain, setChain] = useState(DEMO.chain);
  const [network, setNetwork] = useState(DEMO.network);
  const [tx, setTx] = useState(DEMO.transactionHash);
  const [recipient, setRecipient] = useState(DEMO.recipient);
  const [asset, setAsset] = useState(DEMO.assetContract);
  const [amount, setAmount] = useState(DEMO.expectedAmount);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [sigValid, setSigValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSigValid(null);
    try {
      const otv = new OpenTrustVerify({ baseUrl: API_BASE, apiKey: DEMO_KEY });
      const result = await otv.verifyIncomingTransfer({
        chain,
        network,
        transactionHash: tx,
        recipient,
        asset: { type: "erc20", contract: asset, symbol: "USDC", decimals: 6 },
        expectedAmount: amount || undefined,
      });
      setVerdict(result.verdict);
      const v = await otv.verifySignature(result.verdict);
      setSigValid(v.valid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setVerdict(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--otv-border)]">
        <div className="otv-container flex h-16 items-center justify-between">
          <Logo href="http://localhost:4083/" />
          <span className="text-xs tracking-widest text-[var(--otv-text-muted)]">PUBLIC VERIFIER</span>
        </div>
      </header>

      <main className="otv-container grid gap-8 py-10 lg:grid-cols-2">
        <Card>
          <h1 className="text-2xl font-bold">Verify an incoming transfer</h1>
          <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
            OTV independently evaluates whether observed activity represents confirmed value.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onVerify}>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--otv-text-muted)]">Blockchain</span>
              <Input value={chain} onChange={(e) => setChain(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--otv-text-muted)]">Network</span>
              <Input value={network} onChange={(e) => setNetwork(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--otv-text-muted)]">Transaction hash</span>
              <Input className="otv-mono" value={tx} onChange={(e) => setTx(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--otv-text-muted)]">Recipient</span>
              <Input className="otv-mono" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--otv-text-muted)]">Expected asset (optional)</span>
              <Input className="otv-mono" value={asset} onChange={(e) => setAsset(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--otv-text-muted)]">Expected amount (optional)</span>
              <Input className="otv-mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Verifying…" : "Verify"}
            </Button>
          </form>
          {error && (
            <div className="mt-4">
              <Alert tone="danger" title="Verification error">
                {error}
              </Alert>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {verdict ? (
            <>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs tracking-widest text-[var(--otv-text-muted)]">VERDICT</div>
                    <div className="mt-1 text-3xl font-bold tracking-wide">{verdict.status}</div>
                  </div>
                  <StatusBadge status={verdict.status} />
                </div>
                <div className="mt-6 space-y-4">
                  <HashDisplay label="Transaction" value={verdict.transactionHash} />
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Asset</span>
                    <span>{verdict.asset.symbol ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Amount</span>
                    <span className="otv-mono">{verdict.amount ?? "—"}</span>
                  </div>
                  <HashDisplay label="Recipient" value={verdict.recipient} />
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Finality</span>
                    <span>{verdict.finality.state}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Balance change</span>
                    <span className="otv-mono">{verdict.balanceDelta ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Checked</span>
                    <span>{new Date(verdict.checkedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Signature</span>
                    <span>{sigValid == null ? "…" : sigValid ? "Valid" : "Invalid"}</span>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button variant="secondary" type="button" onClick={() => setShowEvidence((s) => !s)}>
                    View Evidence
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(verdict, null, 2))}
                  >
                    Copy Verdict
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/?v=${verdict.verdictId}`;
                      navigator.clipboard.writeText(url);
                    }}
                  >
                    Share Verification
                  </Button>
                </div>
              </Card>
              <TrustState status={verdict.status} evidence={verdict.evidence} />
              {showEvidence && (
                <Card>
                  <h2 className="mb-2 text-sm font-semibold tracking-wide text-[var(--otv-text-secondary)]">
                    EVIDENCE
                  </h2>
                  {verdict.evidence.map((item) => (
                    <EvidenceItemView key={item.type} item={item} />
                  ))}
                </Card>
              )}
            </>
          ) : (
            <Card>
              <h2 className="text-lg font-semibold">Awaiting verification</h2>
              <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
                Submit a claim to receive a signed OTV verdict. Demo values are prefilled for local mock chain.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
