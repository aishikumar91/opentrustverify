import { useState } from "react";
import { Link } from "react-router-dom";
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
import { DEMO_CLAIM, isDemoMode, verifyIncoming } from "@/lib/otv";

export function VerifierPage() {
  const [chain, setChain] = useState(DEMO_CLAIM.chain);
  const [network, setNetwork] = useState(DEMO_CLAIM.network);
  const [tx, setTx] = useState(DEMO_CLAIM.transactionHash);
  const [recipient, setRecipient] = useState(DEMO_CLAIM.recipient);
  const [asset, setAsset] = useState(DEMO_CLAIM.asset?.contract ?? "");
  const [amount, setAmount] = useState(DEMO_CLAIM.expectedAmount ?? "");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [sigValid, setSigValid] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"demo" | "api" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSigValid(null);
    try {
      const result = await verifyIncoming({
        chain,
        network,
        transactionHash: tx,
        recipient,
        asset: { type: "erc20", contract: asset, symbol: "USDC", decimals: 6 },
        expectedAmount: amount || undefined,
      });
      setVerdict(result.verdict);
      setSigValid(result.signatureValid);
      setMode(result.mode);
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
          <Logo href="/" />
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-[var(--otv-text-secondary)]">
              Dashboard
            </Link>
            <span className="text-xs tracking-widest text-[var(--otv-text-muted)]">PUBLIC VERIFIER</span>
          </div>
        </div>
      </header>

      <main className="otv-container grid gap-8 py-10 lg:grid-cols-2">
        <Card>
          <h1 className="text-2xl font-bold">Verify an incoming transfer</h1>
          <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
            OTV independently evaluates whether observed activity represents confirmed value.
          </p>
          {isDemoMode && (
            <div className="mt-4">
              <Alert tone="info" title="Demo mode">
                Running deterministic verification in the browser for this Vercel preview.
              </Alert>
            </div>
          )}
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
                    {mode && (
                      <div className="mt-1 text-xs text-[var(--otv-text-muted)]">
                        mode: {mode}
                      </div>
                    )}
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
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
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
                Submit a claim to receive a signed OTV verdict. Demo values are prefilled.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
