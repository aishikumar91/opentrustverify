"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUpRight } from "lucide-react";
import { withBasePath } from "../lib/basePath";
import { deployFakeTokenFromWallet, fireVectorFromLinkedWallet } from "../lib/clientTriggers";
import { walletErrorMessage } from "../lib/walletErrors";
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
  const [firing, setFiring] = useState<Vector | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [runs, setRuns] = useState<ExecutedRunView[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<{ address: string | null; ready: boolean }>({
    address: null,
    ready: false,
  });

  useEffect(() => {
    function refreshSigner() {
      const provider = getActiveWalletProvider();
      const address = getActiveWalletAddress();
      setSigner({ address, ready: Boolean(provider && address) });
      if (address && !targetAddress.trim()) {
        setTargetAddress(address);
      }
    }
    refreshSigner();
    const unsubscribe = subscribeSigningChange(refreshSigner);
    window.addEventListener("focus", refreshSigner);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", refreshSigner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setError(walletErrorMessage(err, "Failed to load runs."));
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
      const provider = getActiveWalletProvider();
      const connectedSigner = getActiveWalletAddress();
      if (!provider || !connectedSigner) {
        throw new Error("Connect a wallet to sign.");
      }
      setSigner({ address: connectedSigner, ready: true });

      const target = (targetAddress.trim() || connectedSigner).trim();
      if (!target) {
        throw new Error("Set a target.");
      }
      if (!targetAddress.trim()) {
        setTargetAddress(connectedSigner);
      }

      for (const addr of [target, connectedSigner]) {
        const pre = await fetch(
          withBasePath(`/api/admin/allowlist/check?address=${encodeURIComponent(addr)}`),
          { credentials: "include" }
        );
        const preData = await pre.json().catch(() => ({}));
        if (!pre.ok || !preData.allowlisted) {
          throw new Error(
            (preData as { error?: string }).error ?? `Not allowlisted: ${addr}`
          );
        }
      }

      const chainRes = await fetch(withBasePath("/api/config/public"));
      const chainCfg = chainRes.ok
        ? ((await chainRes.json()) as { chainId?: number })
        : { chainId: 8453 };

      const clientResult = await fireVectorFromLinkedWallet({
        vector,
        targetAddress: target,
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
      if (!res.ok) throw new Error(data.error ?? "Failed to record.");

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
      setError(walletErrorMessage(err, "Attack failed."));
    } finally {
      setFiring(null);
    }
  }

  async function deployTestToken() {
    setError(null);
    setDeploying(true);
    try {
      if (!getActiveWalletProvider() || !getActiveWalletAddress()) {
        throw new Error("Connect a wallet to sign.");
      }
      const chainRes = await fetch(withBasePath("/api/config/public"));
      const chainCfg = chainRes.ok
        ? ((await chainRes.json()) as { chainId?: number })
        : { chainId: 8453 };
      const result = await deployFakeTokenFromWallet(chainCfg.chainId || 8453);
      setFakeTokenContract(result.contractAddress);
    } catch (err) {
      setError(walletErrorMessage(err, "Deploy failed."));
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
      if (!res.ok) throw new Error(data.error ?? "Verify failed.");
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
      setError(walletErrorMessage(err, "Verify failed."));
    } finally {
      setVerifying(null);
    }
  }

  const canSign = signer.ready;

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
            {canSign && signer.address ? (
              <p className="truncate font-mono text-[11px] text-[#7EE2A8]">
                {signer.address.slice(0, 6)}…{signer.address.slice(-4)}
              </p>
            ) : (
              <p className="text-[11px] text-[#FF5C6C]">Offline</p>
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
              Contract
            </p>
            <button
              type="button"
              onClick={() => void deployTestToken()}
              disabled={!canSign || deploying || firing !== null}
              className="font-caption min-h-8 shrink-0 rounded-full border border-[#20242C] px-3 text-[11px] text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {deploying ? "Deploying…" : "Deploy"}
            </button>
          </div>
          <label className="block" aria-label="Contract address">
            <input
              value={fakeTokenContract}
              onChange={(e) => setFakeTokenContract(e.target.value)}
              placeholder="0x…"
              className="min-h-10 w-full rounded-lg border border-[#20242C] bg-[#0A0E14] px-3 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4150] focus:border-[#E11D48]"
            />
          </label>
          <div className="grid gap-2">
            {VECTORS.map((v) => (
              <button
                key={v.id}
                onClick={() => void fire(v.id)}
                disabled={
                  !canSign ||
                  firing !== null ||
                  deploying ||
                  (v.needsContract && !fakeTokenContract.trim())
                }
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
          <h2 className="font-caption mb-4 text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
            Runs
          </h2>
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
                    <p className="mt-2 font-mono text-[11px] text-[#8A95A5]">
                      {shortAddr(r.targetAddress)}
                    </p>
                    {assessed ? (
                      <p className="font-caption mt-4 text-sm text-[#ECEFF3]">
                        {intercepted ? "Fraud intercepted" : "Verified legitimate"}
                        {typeof r.threatScore === "number" ? ` · ${r.threatScore}` : ""}
                      </p>
                    ) : (
                      <button
                        onClick={() => void verify(r.txHash)}
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
