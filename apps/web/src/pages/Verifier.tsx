import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Verdict } from "@otv/verdict-schema";
import {
  Alert,
  Button,
  Card,
  EvidenceItemView,
  HashDisplay,
  Input,
  StatusBadge,
  TrustState,
} from "@otv/ui";
import { publicClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function VerifierPage() {
  const { user, client } = useAuth();
  const [params] = useSearchParams();
  const [lookupId, setLookupId] = useState(params.get("id") ?? "");
  const [chain, setChain] = useState("ethereum");
  const [network, setNetwork] = useState("sepolia");
  const [tx, setTx] = useState("");
  const [recipient, setRecipient] = useState("");
  const [asset, setAsset] = useState("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  const [amount, setAmount] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [sigValid, setSigValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  async function showVerdict(next: Verdict) {
    setVerdict(next);
    const check = await publicClient.verifySignature(next);
    setSigValid(check.valid);
  }

  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    setLookupId(id);
    publicClient
      .getVerdict(id)
      .then(showVerdict)
      .catch((err) => setError(err instanceof Error ? err.message : "Lookup failed"));
  }, [params]);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await showVerdict(await publicClient.getVerdict(lookupId.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
      setVerdict(null);
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError("Log in to submit a new verification. You can still look up an existing verdict ID.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await client.verifyIncoming({
        chain,
        network,
        transactionHash: tx,
        recipient,
        asset: { type: "erc20", contract: asset, symbol: "USDC", decimals: 6 },
        expectedAmount: amount || undefined,
      });
      await showVerdict(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setVerdict(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="otv-container grid gap-8 py-10 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <h1 className="text-2xl font-bold">Look up a verdict</h1>
            <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
              Paste a verdict ID someone shared with you. No key needed.
            </p>
            <form className="mt-4 flex gap-2" onSubmit={onLookup}>
              <Input className="otv-mono" placeholder="vr_…" value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
              <Button type="submit" size="sm" variant="secondary" disabled={loading}>
                Lookup
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Submit a claim</h2>
            <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
              Sign in to check a new hash. The signature is created on the API, not in your browser.
            </p>
            {!user && (
              <div className="mt-4">
                <Alert tone="info" title="Sign in to verify">
                  <Link className="text-[var(--otv-brand)]" to="/login">
                    Log in
                  </Link>{" "}
                  or{" "}
                  <Link className="text-[var(--otv-brand)]" to="/register">
                    create an account
                  </Link>
                  .
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
              <Button type="submit" size="sm" disabled={loading || !user} className="w-full">
                {loading ? "Verifying…" : "Verify"}
              </Button>
            </form>
            {error && (
              <div className="mt-4">
                <Alert tone="danger" title="Could not verify">
                  {error}
                </Alert>
              </div>
            )}
          </Card>
        </div>

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
                    <span>{verdict.asset.symbol ?? "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Amount</span>
                    <span className="otv-mono">{verdict.amount ?? "-"}</span>
                  </div>
                  <HashDisplay label="Recipient" value={verdict.recipient} />
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Finality</span>
                    <span>{verdict.finality.state}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--otv-text-muted)]">Balance change</span>
                    <span className="otv-mono">{verdict.balanceDelta ?? "-"}</span>
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
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowEvidence((s) => !s)}>
                    View evidence
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(verdict, null, 2))}
                  >
                    Copy verdict
                  </Button>
                </div>
              </Card>
              <TrustState status={verdict.status} evidence={verdict.evidence} />
              {showEvidence && (
                <Card>
                  <h2 className="mb-2 text-sm font-semibold tracking-wide text-[var(--otv-text-secondary)]">
                    Evidence
                  </h2>
                  {verdict.evidence.map((item) => (
                    <EvidenceItemView key={item.type} item={item} />
                  ))}
                </Card>
              )}
            </>
          ) : (
            <Card>
              <h2 className="text-lg font-semibold">Nothing loaded yet</h2>
              <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
                Look up a verdict ID, or sign in and submit a hash. Signing never happens in this
                browser.
              </p>
            </Card>
          )}
        </div>
      </main>
  );
}
