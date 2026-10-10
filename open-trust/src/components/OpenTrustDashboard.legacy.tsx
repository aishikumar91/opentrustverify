"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUpRight } from "lucide-react";
import { withBasePath } from "../lib/basePath";
import {
  deployFakeTokenFromWallet,
  estimateVectorGas,
  fireVectorFromLinkedWallet,
  ZERO_VALUE_PRESET_META,
  zeroValuePresetAddress,
  type GasEstimate,
  type ZeroValuePreset,
} from "../lib/clientTriggers";
import { walletErrorMessage } from "../lib/walletErrors";
import {
  getActiveWalletAddress,
  getActiveWalletProvider,
  subscribeSigningChange,
} from "../lib/walletProvider";
import { formatUnits, isAddress } from "viem";
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
  const [tokenPreset, setTokenPreset] = useState<ZeroValuePreset>("USDC");
  const [amountEth, setAmountEth] = useState("0.001");
  const [gasEst, setGasEst] = useState<{ lure: GasEstimate; zero: GasEstimate } | null>(null);
  const [gasLoading, setGasLoading] = useState(false);
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
  const [tab, setTab] = useState<"overview" | "vectors" | "runs" | "settings">("overview");
  const [chain, setChain] = useState<{ chainId: number; chainName: string } | null>(null);
  const [balances, setBalances] = useState<{ preset: string; symbol: string; display: string }[] | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    void fetch(withBasePath("/api/config/public"), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.chainId) {
          setChain({ chainId: data.chainId, chainName: data.chainName ?? "Base" });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function safeBigInt(hex: unknown): bigint {
    if (typeof hex !== "string" || hex === "0x" || !hex.startsWith("0x")) return 0n;
    try {
      return BigInt(hex);
    } catch {
      return 0n;
    }
  }

  async function refreshBalances() {
    const provider = getActiveWalletProvider();
    const addr = getActiveWalletAddress();
    if (!provider || !addr) {
      setBalances(null);
      return;
    }
    setBalancesLoading(true);
    try {
      const cid = chain?.chainId ?? 8453;
      const rows: { preset: string; symbol: string; display: string }[] = [];
      const nativeHex = (await provider.request({
        method: "eth_getBalance",
        params: [addr, "latest"],
      })) as string;
      rows.push({ preset: "native", symbol: "ETH", display: `${formatUnits(safeBigInt(nativeHex), 18)} ETH` });
      for (const preset of Object.keys(ZERO_VALUE_PRESET_META) as ZeroValuePreset[]) {
        const token = zeroValuePresetAddress(preset, cid);
        if (!token) continue;
        const meta = ZERO_VALUE_PRESET_META[preset];
        const data = `0x70a08231${addr.slice(2).padStart(64, "0")}`;
        const balHex = (await provider.request({
          method: "eth_call",
          params: [{ to: token, data }, "latest"],
        })) as string;
        rows.push({ preset, symbol: meta.symbol, display: `${formatUnits(safeBigInt(balHex), meta.decimals)} ${meta.symbol}` });
      }
      setBalances(rows);
    } catch {
      setBalances(null);
    } finally {
      setBalancesLoading(false);
    }
  }

  useEffect(() => {
    if (signer.ready && signer.address) {
      void refreshBalances();
    } else {
      setBalances(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer.address, signer.ready]);

  useEffect(() => {
    if (!signer.ready) {
      setGasEst(null);
      return;
    }
    const target = (targetAddress.trim() || signer.address || "").trim();
    if (!target || !isAddress(target)) {
      setGasEst(null);
      return;
    }
    setGasLoading(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const chainRes = await fetch(withBasePath("/api/config/public"));
          const chainCfg = chainRes.ok
            ? ((await chainRes.json()) as { chainId?: number })
            : { chainId: 8453 };
          const cid = chainCfg.chainId || 8453;
          const lureAmount =
            /^\d*\.?\d+$/.test(amountEth.trim()) && Number(amountEth.trim()) > 0
              ? amountEth.trim()
              : "0.001";
          const lure = await estimateVectorGas({ vector: "mempoolLure", targetAddress: target, amountEth: lureAmount });
          const zero = await estimateVectorGas({
            vector: "zeroValue",
            targetAddress: target,
            tokenPreset,
            fakeTokenContract: fakeTokenContract.trim() || undefined,
            chainId: cid,
          });
          setGasEst({ lure, zero });
        } catch {
          setGasEst(null);
        } finally {
          setGasLoading(false);
        }
      })();
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer.ready, targetAddress, amountEth, tokenPreset, fakeTokenContract, signer.address]);

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

      const lureAmount = amountEth.trim();
      if (vector === "mempoolLure" && (!/^\d*\.?\d+$/.test(lureAmount) || Number(lureAmount) <= 0)) {
        throw new Error("Value must be a positive number (ETH).");
      }

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
        tokenPreset,
        amount: vector === "mempoolLure" ? lureAmount : undefined,
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
        <nav className="flex flex-wrap gap-2 lg:col-span-12" aria-label="Admin sections">
          {(
            [
              ["overview", "Overview"],
              ["vectors", "Fire vectors"],
              ["runs", "Runs"],
              ["settings", "Settings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`font-caption min-h-10 rounded-full px-4 text-xs transition ${
                tab === id
                  ? "bg-[#E11D48] text-white"
                  : "border border-[#20242C] text-[#8A95A5] hover:border-[#E11D48] hover:text-[#E11D48]"
              }`}
            >
              {label}
              {id === "runs" && runs.length > 0 ? ` (${runs.length})` : ""}
            </button>
          ))}
        </nav>
        {tab === "overview" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:col-span-12">
              <div className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4">
                <p className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">Signer</p>
                <p className="mt-2 truncate font-mono text-sm text-[#ECEFF3]">
                  {signer.address ? shortAddr(signer.address) : "Offline"}
                </p>
                <p className={`mt-1 text-[11px] ${signer.ready ? "text-[#7EE2A8]" : "text-[#FF5C6C]"}`}>
                  {signer.ready ? "Ready to sign" : "Not connected"}
                </p>
              </div>
              <div className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4">
                <p className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">Network</p>
                <p className="mt-2 truncate font-mono text-sm text-[#ECEFF3]">
                  {chain ? `${chain.chainName} · ${chain.chainId}` : "…"}
                </p>
                <p className="mt-1 text-[11px] text-[#5A6575]">Treasury chain</p>
              </div>
              <div className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4">
                <p className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">Runs</p>
                <p className="mt-2 font-mono text-sm text-[#ECEFF3]">{runs.length}</p>
                <p className="mt-1 text-[11px] text-[#5A6575]">Broadcast total</p>
              </div>
              <div className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4">
                <p className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">Intercepted</p>
                <p className="mt-2 font-mono text-sm text-[#ECEFF3]">
                  {runs.filter((r) => r.status === "FRAUD_INTERCEPTED").length}
                </p>
                <p className="mt-1 text-[11px] text-[#5A6575]">Fraud stopped</p>
              </div>
            </section>
            <section className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4 lg:col-span-7">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">Treasury</h2>
                <button
                  type="button"
                  onClick={() => void refreshBalances()}
                  disabled={!canSign || balancesLoading}
                  className="font-caption min-h-8 rounded-full border border-[#20242C] px-3 text-[11px] text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {balancesLoading ? "Loading…" : "Refresh"}
                </button>
              </div>
              {!balances && (
                <p className="text-sm text-[#6B7686]">
                  {canSign ? "No balances loaded yet." : "Connect a wallet to load balances."}
                </p>
              )}
              {balances && (
                <ul className="divide-y divide-[#171B22]">
                  {balances.map((b) => (
                    <li key={b.preset} className="flex items-center justify-between gap-2 py-2">
                      <span className="font-mono text-xs text-[#8A95A5]">{b.symbol}</span>
                      <span className="truncate font-mono text-xs text-[#ECEFF3]">{b.display}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="flex flex-col gap-2 rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4 lg:col-span-5">
              <h2 className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">Quick fire</h2>
              {(["mempoolLure", "zeroValue"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => void fire(v)}
                  disabled={!canSign || firing !== null}
                  className="font-caption flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#E11D48] px-4 text-sm text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {firing === v && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                  {v === "mempoolLure" ? "Mempool lure" : "Zero-value transfer"}
                </button>
              ))}
              <p className="text-[11px] leading-relaxed text-[#5A6575]">
                Mempool lure uses starved gas and stays pending (never confirms) by design; other
                vectors use wallet-estimated gas and confirm normally.
              </p>
              {error && <p className="break-words text-xs text-[#FF5C6C]">{error}</p>}
            </section>
            <section className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4 lg:col-span-12">
              <h2 className="font-caption mb-3 text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
                Recent activity
              </h2>
              {runs.length === 0 && <p className="text-sm text-[#6B7686]">None yet.</p>}
              <ul className="divide-y divide-[#171B22]">
                {runs.slice(0, 4).map((r) => (
                  <li key={r.txHash} className="flex items-center justify-between gap-2 py-2">
                    <a
                      href={r.explorerUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-xs text-[#ECEFF3] hover:text-[#E11D48]"
                    >
                      {shortHash(r.txHash)}
                    </a>
                    <span className="shrink-0 font-mono text-[11px] text-[#8A95A5]">
                      {r.status === "FRAUD_INTERCEPTED"
                        ? "Intercepted"
                        : r.status === "VERIFIED_LEGITIMATE"
                          ? "Legitimate"
                          : (r.status ?? "Broadcast")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        {tab === "vectors" && (
        <>
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
          <label className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
            Value (ETH · mempool lure)
            <input
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
              placeholder="0.001"
              inputMode="decimal"
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
          <div className="flex items-center justify-between gap-2">
            <p className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
              Zero-value token
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {(Object.keys(ZERO_VALUE_PRESET_META) as ZeroValuePreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTokenPreset(p)}
                  title={`${ZERO_VALUE_PRESET_META[p].blurb} (verified on-chain)`}
                  className={`font-caption min-h-8 rounded-full border px-3 text-[11px] transition ${
                    tokenPreset === p
                      ? "border-[#E11D48] text-[#E11D48]"
                      : "border-[#20242C] text-[#8A95A5] hover:border-[#E11D48] hover:text-[#E11D48]"
                  }`}
                >
                  {p === "cbBTC" ? "cbBTC (BTC)" : p}
                </button>
              ))}
            </div>
          </div>
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
          <p className="text-[11px] leading-relaxed text-[#5A6575]">
            Mempool lure uses starved gas and stays pending (never confirms) by design; other
            vectors use wallet-estimated gas and confirm normally.
          </p>
          <div className="rounded-lg border border-[#1C2430] bg-[#0A0E14] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-caption text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
                Gas estimate
              </p>
              {gasLoading && <p className="text-[11px] text-[#6B7686]">Estimating…</p>}
            </div>
            {!gasEst && !gasLoading && (
              <p className="text-[11px] text-[#5A6575]">Connect a wallet and set a target to preview gas.</p>
            )}
            {gasEst && (
              <ul className="space-y-1 font-mono text-[11px] text-[#B9C4CE]">
                <li className="flex items-center justify-between gap-2">
                  <span>Lure ({amountEth.trim() || "0.001"} ETH)</span>
                  <span>
                    {gasEst.lure.gasLimit} units ≈ {gasEst.lure.feeEth} ETH
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Zero-value ({tokenPreset})</span>
                  <span>
                    {gasEst.zero.gasLimit} units ≈ {gasEst.zero.feeEth} ETH
                  </span>
                </li>
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-[#5A6575]">
              Lure broadcasts at a starved fee (stays pending); fee shown is at current price for
              reference.
            </p>
          </div>
          {error && <p className="break-words text-xs text-[#FF5C6C]">{error}</p>}
        </section>
        </>
        )}
        {tab === "runs" && (
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
        )}
        {tab === "settings" && (
        <details className="rounded-2xl border border-[#1C2430] bg-[#0D121A] p-4 lg:col-span-12">
          <summary className="font-caption cursor-pointer text-[11px] uppercase tracking-[0.16em] text-[#8A95A5]">
            Settings
          </summary>
          <div className="mt-4">
            <AdminSettingsPanel />
          </div>
        </details>
        )}
      </main>
    </div>
  );
}
