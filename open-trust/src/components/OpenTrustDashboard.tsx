"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUpRight } from "lucide-react";
import { withBasePath } from "../lib/basePath";
import { deployFakeTokenFromWallet, fireVectorFromLinkedWallet } from "../lib/clientTriggers";
import {
  getActiveWalletAddress,
  getActiveWalletProvider,
  subscribeSigningChange,
} from "../lib/walletProvider";
import LinkWallet from "./LinkWallet";
import BrandMark from "./BrandMark";
import AdminSettingsPanel from "./AdminSettingsPanel";

type Vector = "mempoolLure" | "addressPoisoning" | "fakeTokenTransfer" | "zeroValue";

interface ExecutedRunView {
  txHash: string;
  explorerUrl: string;
  vector: string;
  targetAddress: string;
  broadcastAt: string | null;
  status: string | null;
  threatScore: number | null;
  reasons: string[];
  realBalanceImpact: string | null;
  actionRecommended: string | null;
  verifiedAt: string | null;
}

const VECTORS: { id: Vector; label: string; needsContract: boolean }[] = [
  { id: "mempoolLure", label: "Mempool lure", needsContract: false },
  { id: "zeroValue", label: "Zero-value transfer", needsContract: false },
  { id: "addressPoisoning", label: "Address poisoning", needsContract: true },
  { id: "fakeTokenTransfer", label: "Unverified token transfer", needsContract: true },
];

function shortHash(h: string) {
  if (!h || h.length < 14) return h;
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

function shortAddr(a: string) {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function OpenTrustDashboard() {
  const [targetAddress, setTargetAddress] = useState("");
  const [fakeTokenContract, setFakeTokenContract] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);
  const [firing, setFiring] = useState<Vector | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [runs, setRuns] = useState<ExecutedRunView[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<{ address: string | null; ready: boolean }>({
    address: null,
    ready: false,
  });

  // SIGNER-STATUS-EFFECT: mirror the in-memory signing session so the UI shows
  // whether this tab can actually sign (provider may vanish on reload while
  // the linked address is still displayed).
  useEffect(() => {
    function refreshSigner() {
      const provider = getActiveWalletProvider();
      const address = getActiveWalletAddress();
      setSigner({ address, ready: Boolean(provider && address) });
    }
    refreshSigner();
    const unsubscribe = subscribeSigningChange(refreshSigner);
    window.addEventListener("focus", refreshSigner);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", refreshSigner);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(withBasePath("/api/admin/runs"), { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load runs");
        if (!cancelled) setRuns(data.runs ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load runs");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRuns(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLinked(address: string | null) {
    if (address) setTargetAddress(address);
  }

  function useLinkedAsTarget(address: string) {
    setTargetAddress(address);
  }

  function upsertRun(next: ExecutedRunView) {
    setRuns((prev) => {
      const without = prev.filter((r) => r.txHash !== next.txHash);
      return [next, ...without];
    });
  }

  async function fire(vector: Vector) {
    setError(null);
    setFiring(vector);
    try {
      if (!targetAddress.trim()) {
        throw new Error("Set a target wallet (or connect and Use as target).");
      }

      // Signer IS the connected wallet (in-memory EIP-1193 session in this tab).
      // Reload clears it, passkey-only links never have it, and a wallet
      // connected in the main OTV app does not carry over to this console.
      const provider = getActiveWalletProvider();
      const connectedSigner = getActiveWalletAddress();
      if (!provider || !connectedSigner) {
        const linked = targetAddress.trim();
        throw new Error(
          linked
            ? `Signing session not active in this tab (linked target ${linked} found, but no wallet provider). Reload clears signing; passkey-only links cannot sign; a wallet connected in the main OTV app does not carry over. In the Linked wallet panel above click Connect MetaMask or Trust Wallet / WC again in THIS admin console, then retry. Seed phrases are never accepted.`
            : "No signing wallet connected in this tab. In the Linked wallet panel click Connect MetaMask (or Trust Wallet / WC) in THIS admin console, then Use as target and retry. Seed phrases are never accepted."
        );
      }
      setSigner({ address: connectedSigner, ready: true });

      // Self-test preflight: signer wallet == connected wallet.
      // Verify target (and signer) are allowlisted BEFORE prompting a signature,
      // so a misconfigured target fails fast without spending gas.
      const signerAddr = getActiveWalletAddress();
      for (const addr of [targetAddress.trim(), signerAddr].filter(Boolean) as string[]) {
        const pre = await fetch(
          withBasePath(`/api/admin/allowlist/check?address=${encodeURIComponent(addr)}`),
          { credentials: "include" }
        );
        const preData = await pre.json().catch(() => ({}));
        if (!pre.ok || !preData.allowlisted) {
          throw new Error(
            (preData as { hint?: string }).hint ??
              (preData as { error?: string }).error ??
              `Address ${addr} is not allowlisted. Click 'Use as target' so target equals your linked signer wallet, then retry.`
          );
        }
      }

      const chainRes = await fetch(withBasePath("/api/config/public"));
      const chainCfg = chainRes.ok
        ? ((await chainRes.json()) as { chainId?: number })
        : { chainId: 8453 };

      const clientResult = await fireVectorFromLinkedWallet({
        vector,
        targetAddress: targetAddress.trim(),
        fakeTokenContract: fakeTokenContract.trim() || undefined,
        chainId: chainCfg.chainId || 8453,
      });

      const res = await fetch(withBasePath("/api/admin/record-run"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          txHash: clientResult.txHash,
          vector: clientResult.vector,
          targetAddress: clientResult.targetAddress,
          fromAddress: clientResult.fromAddress,
          broadcastAt: clientResult.broadcastAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to record broadcast");

      upsertRun({
        txHash: data.txHash,
        explorerUrl: data.explorerUrl,
        vector: data.vector,
        targetAddress: data.targetAddress,
        broadcastAt: data.broadcastAt,
        status: data.run?.status ?? "BROADCAST",
        threatScore: data.run?.threatScore ?? null,
        reasons: data.run?.reasons ?? [],
        realBalanceImpact: data.run?.realBalanceImpact ?? null,
        actionRecommended: data.run?.actionRecommended ?? null,
        verifiedAt: data.run?.verifiedAt ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setFiring(null);
    }
  }

  async function deployTestToken() {
    setError(null);
    setDeployMsg(null);
    setDeploying(true);
    try {
      const chainRes = await fetch(withBasePath("/api/config/public"));
      const chainCfg = chainRes.ok
        ? ((await chainRes.json()) as { chainId?: number })
        : { chainId: 8453 };
      const result = await deployFakeTokenFromWallet(chainCfg.chainId || 8453);
      setFakeTokenContract(result.contractAddress);
      setDeployMsg(`3GTT deployed at ${result.contractAddress} (tx ${result.txHash.slice(0, 10)}…). Use it for Address poisoning / Unverified token transfer.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  async function verify(txHash: string) {
    setError(null);
    setVerifying(txHash);
    try {
      const res = await fetch(withBasePath(`/api/verify/${txHash}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setRuns((prev) =>
        prev.map((r) =>
          r.txHash === txHash
            ? {
                ...r,
                status: data.status,
                threatScore: data.threatScore,
                reasons: data.reasons ?? [],
                realBalanceImpact: data.realBalanceImpact ?? null,
                actionRecommended: data.actionRecommended ?? null,
                vector: data.vector && data.vector !== "NONE" ? data.vector : r.vector,
                verifiedAt: new Date().toISOString(),
              }
            : r
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setVerifying(null);
    }
  }

  return (
    <div className="font-ui min-h-screen overflow-x-hidden bg-[#0A0E14] text-[#ECEFF3] antialiased">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#171B22] bg-[#0A0E14]/90 px-4 py-3 backdrop-blur">
        <BrandMark size="sm" />
        <a
          href={withBasePath("/api/auth/logout")}
          className="font-caption inline-flex min-h-8 items-center rounded-full bg-[#E11D48] px-4 text-xs text-white hover:bg-[#F43F5E]"
        >
          Sign out
        </a>
      </header>
      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 lg:grid-cols-12">
        <section className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4 lg:col-span-7">
          <LinkWallet onLinked={handleLinked} onUseAsTarget={useLinkedAsTarget} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
              Signer
            </p>
            {signer.ready && signer.address ? (
              <p className="truncate font-mono text-[11px] text-[#7EE2A8]">
                {signer.address.slice(0, 6)}…{signer.address.slice(-4)} ready
              </p>
            ) : (
              <p className="text-[11px] text-[#FF5C6C]">Not connected — reconnect above to sign</p>
            )}
          </div>
          <label className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
            Target
            <input
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x…"
              className="mt-2 min-h-10 w-full rounded-lg border border-[#20242C] bg-[#0A0E14] px-3 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4150] focus:border-[#E11D48]"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <p className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
              Contract (optional for zero-value)
            </p>
            <button
              type="button"
              onClick={() => void deployTestToken()}
              disabled={deploying || firing !== null}
              title="Deploy a fresh 3GTT drill token with the connected wallet and fill this field"
              className="font-caption min-h-8 shrink-0 rounded-full border border-[#20242C] px-3 text-[11px] text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {deploying ? "Deploying…" : "Deploy test token"}
            </button>
          </div>
          {deployMsg && <p className="break-words text-[11px] text-[#8A95A5]">{deployMsg}</p>}
          <label className="mt-2 block" aria-label="Contract address">
            <input
              value={fakeTokenContract}
              onChange={(e) => setFakeTokenContract(e.target.value)}
              placeholder="0x…"
              className="mt-2 min-h-10 w-full rounded-lg border border-[#20242C] bg-[#0A0E14] px-3 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4150] focus:border-[#E11D48]"
            />
          </label>
          <p className="-mt-2 text-[11px] leading-relaxed text-[#5A6575]">
            Zero-value transfer needs no contract (uses USDC on Base, or the contract above as override).
          </p>
          <div className="grid gap-2">
            {VECTORS.map((v) => (
              <button
                key={v.id}
                onClick={() => fire(v.id)}
                disabled={!targetAddress || firing !== null || (v.needsContract && !fakeTokenContract.trim())}
                className="font-caption flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#E11D48] px-4 text-sm text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {firing === v.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                {v.label}
              </button>
            ))}
          </div>
          {error && <p className="break-words text-xs text-[#FF5C6C]">{error}</p>}
        </section>

        <section className="lg:col-span-12">
          <h2 className="font-caption mb-4 text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">Runs</h2>
          {loadingRuns && <p className="text-sm text-[#6B7686]">Loading</p>}
          {!loadingRuns && runs.length === 0 && <p className="text-sm text-[#6B7686]">None</p>}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {runs.map((r) => {
                const intercepted = r.status === "FRAUD_INTERCEPTED";
                const verified = r.status === "VERIFIED_LEGITIMATE";
                const assessed = intercepted || verified;
                return (
                  <motion.li
                    key={r.txHash}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4"
                  >
                    <a
                      href={r.explorerUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 font-mono text-sm text-[#ECEFF3] hover:text-[#E11D48]"
                    >
                      <span className="truncate">{shortHash(r.txHash)}</span>
                      <ArrowUpRight className="h-3 w-3 shrink-0" />
                    </a>
                    <p className="mt-2 font-mono text-[11px] text-[#8A95A5]">{shortAddr(r.targetAddress)}</p>
                    {assessed ? (
                      <p className="font-caption mt-4 text-sm text-[#ECEFF3]">
                        {intercepted ? "Fraud intercepted" : "Verified legitimate"}
                        {typeof r.threatScore === "number" ? ` · ${r.threatScore}` : ""}
                      </p>
                    ) : (
                      <button
                        onClick={() => verify(r.txHash)}
                        disabled={verifying === r.txHash}
                        className="font-caption mt-4 min-h-10 w-full rounded-full bg-[#E11D48] px-4 text-xs text-white hover:bg-[#F43F5E] disabled:opacity-40"
                      >
                        {verifying === r.txHash ? "Scanning" : "Verify"}
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>

        <details className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4 lg:col-span-12">
          <summary className="font-caption cursor-pointer text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
            Settings
          </summary>
          <div className="mt-4">
            <AdminSettingsPanel />
          </div>
        </details>
      </main>
    </div>
  );
}
