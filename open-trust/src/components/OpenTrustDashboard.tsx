"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowUpRight, ChevronDown, LayoutGrid, Loader2, LogOut, Search, Settings, Zap } from "lucide-react";
import { useTheme } from "../lib/useTheme";
import ThemeToggle from "./ThemeToggle";
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
import ActionStatus, { type ActionTone } from "./ActionStatus";

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
  chainId: number;
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

export default function OpenTrustDashboard({ role }: { role?: "admin" | "staff" }) {
  const isAdmin = role !== "staff";
  const [targetAddress, setTargetAddress] = useState("");
  const [fakeTokenContract, setFakeTokenContract] = useState("");
  const [tokenPreset, setTokenPreset] = useState<ZeroValuePreset>("USDC");
  const [netId, setNetId] = useState<8453 | 137>(8453);
  const [btcAddr, setBtcAddr] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("otv-btc-watch") ?? "" : ""
  );
  const [btcBal, setBtcBal] = useState<string | null>(null);
  const [btcLoading, setBtcLoading] = useState(false);
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
  const [feed, setFeed] = useState<{ id: number; tone: ActionTone; title: string; detail?: string }[]>([]);
  const feedId = useRef(0);
  const wasReady = useRef(false);
  function pushStatus(tone: ActionTone, title: string, detail?: string) {
    feedId.current += 1;
    const id = feedId.current;
    setFeed((prev) => [{ id, tone, title, detail }, ...prev].slice(0, 4));
  }
  function dismissStatus(id: number) {
    setFeed((prev) => prev.filter((f) => f.id !== id));
  }

  useEffect(() => {
    function refreshSigner() {
      const provider = getActiveWalletProvider();
      const address = getActiveWalletAddress();
      const ready = Boolean(provider && address);
      setSigner({ address, ready });
      if (ready && !wasReady.current) {
        pushStatus("ok", "Wallet connected", address ? shortAddr(address) : undefined);
      }
      if (!ready && wasReady.current) {
        pushStatus("warn", "Wallet disconnected", "Reconnect a wallet to keep signing.");
      }
      wasReady.current = ready;
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
      const cid = netId;
      const rows: { preset: string; symbol: string; display: string }[] = [];
      const nativeHex = (await provider.request({
        method: "eth_getBalance",
        params: [addr, "latest"],
      })) as string;
      rows.push({ preset: "native", symbol: netId === 137 ? "POL" : "ETH", display: `${formatUnits(safeBigInt(nativeHex), 18)} ${netId === 137 ? "POL" : "ETH"}` });
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
  }, [signer.address, signer.ready, netId]);

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
          const cid = netId;
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
  }, [signer.ready, targetAddress, amountEth, tokenPreset, fakeTokenContract, signer.address, netId]);

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

      const clientResult = await fireVectorFromLinkedWallet({
        vector,
        targetAddress: target,
        fakeTokenContract: fakeTokenContract.trim() || undefined,
        tokenPreset,
        amount: vector === "mempoolLure" ? lureAmount : undefined,
        chainId: netId,
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
          chainId: netId,
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
        chainId: data.chainId ?? data.run?.chainId ?? netId,
      });
      pushStatus("ok", "Broadcast executed", `${vector} · ${shortHash(data.txHash)} · ${netId === 137 ? "Polygon" : "Base"}`);
    } catch (err) {
      setError(walletErrorMessage(err, "Attack failed."));
      {
        const rawMsg = err instanceof Error ? err.message : "";
        const chainIssue = /wrong chain|switch.*chain|unrecognized chain|unknown chain|4902/i.test(rawMsg);
        pushStatus(
          chainIssue ? "warn" : "fail",
          chainIssue ? "Incorrect chain or network" : "Fire action failed",
          rawMsg.slice(0, 160) || undefined
        );
      }
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
      const result = await deployFakeTokenFromWallet(netId);
      setFakeTokenContract(result.contractAddress);
      pushStatus("ok", "Token deployed", result.contractAddress);
    } catch (err) {
      setError(walletErrorMessage(err, "Deploy failed."));
      pushStatus("fail", "Deploy action failed", err instanceof Error ? err.message.slice(0, 160) : undefined);
    } finally {
      setDeploying(false);
    }
  }

  async function verify(txHash: string) {
    setError(null);
    setVerifying(txHash);
    try {
      const runChain = runs.find((rr) => rr.txHash === txHash)?.chainId ?? netId;
      const res = await fetch(withBasePath(`/api/verify/${txHash}?chainId=${runChain}`));
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
                chainId: data.chainId ?? r.chainId,
              }
            : r
        )
      );
      pushStatus(
        data.status === "FRAUD_INTERCEPTED" ? "warn" : "ok",
        data.status === "FRAUD_INTERCEPTED" ? "Fraud intercepted" : "Verified legitimate",
        typeof data.threatScore === "number" ? `Threat score ${data.threatScore}` : undefined
      );
    } catch (err) {
      setError(walletErrorMessage(err, "Verify failed."));
      pushStatus("fail", "Verify action failed", err instanceof Error ? err.message.slice(0, 160) : undefined);
    } finally {
      setVerifying(null);
    }
  }

  const [runQuery, setRunQuery] = useState("");

  const { theme, toggleTheme } = useTheme();

  const canSign = signer.ready;
  const navTabs: { id: "overview" | "vectors" | "runs" | "settings"; Icon: typeof LayoutGrid; label: string }[] =
    isAdmin
      ? [
          { id: "overview", Icon: LayoutGrid, label: "Overview" },
          { id: "vectors", Icon: Zap, label: "Vectors" },
          { id: "runs", Icon: Activity, label: "Runs" },
          { id: "settings", Icon: Settings, label: "Settings" },
        ]
      : [
          { id: "overview", Icon: LayoutGrid, label: "Overview" },
          { id: "runs", Icon: Activity, label: "Runs" },
          { id: "settings", Icon: Settings, label: "Settings" },
        ];
  const nativeSym = netId === 137 ? "POL" : "ETH";
  const nativeRow = balances?.find((b) => b.preset === "native");
  const nativeAmt = nativeRow ? Number(nativeRow.display.split(" ")[0]) : NaN;
  const noGas = balances !== null && canSign && (Number.isNaN(nativeAmt) || nativeAmt <= 0);

  async function checkBtc() {
    const a = btcAddr.trim();
    if (!/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/.test(a)) {
      setError("Enter a valid BTC address.");
      return;
    }
    setBtcLoading(true);
    try {
      try {
        window.localStorage.setItem("otv-btc-watch", a);
      } catch {}
      const res = await fetch(`https://mempool.space/api/address/${encodeURIComponent(a)}`);
      const data = await res.json();
      if (!res.ok) throw new Error("BTC lookup failed.");
      const funded = Number(data?.chain_stats?.funded_txo_sum ?? 0);
      const spent = Number(data?.chain_stats?.spent_txo_sum ?? 0);
      setBtcBal(`${((funded - spent) / 1e8).toFixed(8)} BTC`);
      setError(null);
    } catch (err) {
      setBtcBal(null);
      setError(err instanceof Error ? err.message : "BTC lookup failed.");
    } finally {
      setBtcLoading(false);
    }
  }
  const interceptedCount = runs.filter((r) => r.status === "FRAUD_INTERCEPTED").length;
  const legitCount = runs.filter((r) => r.status === "VERIFIED_LEGITIMATE").length;
  const pendingCount = Math.max(runs.length - interceptedCount - legitCount, 0);
  const visibleRuns = runQuery.trim()
    ? runs.filter((r) =>
        `${r.txHash} ${r.targetAddress} ${r.status ?? ""}`.toLowerCase().includes(runQuery.trim().toLowerCase())
      )
    : runs;

  return (
    <div className="nui font-ui min-h-screen bg-[#E9EDF4] pb-24 text-[#101828] antialiased md:pb-0">
      <header
        className={`sticky top-0 z-20 border-b backdrop-blur ${
          theme === "dark"
            ? "border-[#1C2430] bg-[#0A0E14]/95 text-[#ECEFF3]"
            : "border-[#DDE1EA] bg-white/95 text-[#101828]"
        }`}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <BrandMark size="sm" />
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className={`truncate text-sm font-semibold ${theme === "dark" ? "text-[#ECEFF3]" : "text-[#101828]"}`}>
              Greetings 👋
            </p>
            <p className={`truncate text-[11px] ${theme === "dark" ? "text-[#8A95A5]" : "text-[#6B7280]"}`}>
              Fraud console · {chain ? `${chain.chainName} · ${chain.chainId}` : "…"}
            </p>
          </div>
          <label
            className={`mx-auto hidden w-full max-w-xs items-center gap-2 rounded-full border px-3 py-2 md:flex ${
              theme === "dark"
                ? "border-[#1C2430] bg-[#0A0E14]"
                : "border-[#DDE1EA] bg-white"
            }`}
            aria-label="Search runs"
          >
            <Search className={`h-3.5 w-3.5 shrink-0 ${theme === "dark" ? "text-[#8A95A5]" : "text-[#8A8D93]"}`} />
            <input
              value={runQuery}
              onChange={(e) => setRunQuery(e.target.value)}
              placeholder="Search runs…"
              className={`w-full bg-transparent text-xs outline-none placeholder:text-[#AEB4C2] ${
                theme === "dark" ? "text-[#ECEFF3]" : "text-[#101828]"
              }`}
            />
          </label>
          <button
            type="button"
            onClick={() => setTab("vectors")}
            title="Signing console"
            className="hidden items-center gap-2 rounded-full bg-[#101828] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#2E7CF6] sm:inline-flex"
          >
            <span className={`h-2 w-2 rounded-full ${canSign ? "bg-[#12B76A]" : "bg-[#D92D20]"}`} />
            {signer.address ? shortAddr(signer.address) : "My account"}
            <ChevronDown className="h-3.5 w-3.5 text-[#8A8D93]" />
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <a
            href={withBasePath("/api/auth/logout")}
            className={`inline-flex min-h-8 items-center rounded-full border px-4 text-xs font-medium transition hover:border-[#B8E600] ${
              theme === "dark"
                ? "border-[#1C2430] bg-[#0A0E14] text-[#ECEFF3] hover:text-[#D7FF00]"
                : "border-[#DDE1EA] bg-white text-[#101828] hover:text-[#0B0F14]"
            }`}
          >
            Sign out
          </a>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl items-start gap-4 px-4 py-4">
        <aside
          className="sticky top-20 hidden w-16 shrink-0 flex-col items-center gap-1 rounded-[24px] bg-[#101828] py-4 md:flex"
          aria-label="Admin sections"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#0B0F14] ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={withBasePath("/logo.png")}
              alt=""
              width={430}
              height={580}
              className="h-9 w-auto object-contain"
              aria-hidden
            />
          </div>
          {navTabs.map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              title={label}
              aria-label={label}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition ${
                tab === id ? "bg-[#D7FF00] text-[#0B0F14]" : "text-[#D7FF00]/60 hover:bg-white/10 hover:text-[#D7FF00]"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              {tab === id && <span className="absolute -left-2 h-6 w-1 rounded-full bg-[#D7FF00]" />}
            </button>
          ))}
          <div className="mt-auto flex flex-col items-center gap-1 pt-2">
            <a
              href={withBasePath("/api/auth/logout")}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#D7FF00]/60 transition hover:bg-white/10 hover:text-[#D7FF00]"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
            </a>
          </div>
        </aside>
        <main className="grid w-full min-w-0 flex-1 gap-4 pb-4 lg:grid-cols-12">
        {feed.length > 0 && (
          <div className="space-y-2 lg:col-span-12">
            {feed.map((f) => (
              <ActionStatus
                key={f.id}
                tone={f.tone}
                title={f.title}
                detail={f.detail}
                onClose={() => dismissStatus(f.id)}
              />
            ))}
          </div>
        )}
        {tab === "overview" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:col-span-12">
              <div className="rounded-[24px] border border-[#DDE1EA] border-t-4 border-t-[#B8E600] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">Signer</p>
                  <span className={`h-2 w-2 rounded-full ${signer.ready ? "bg-[#12B76A]" : "bg-[#D92D20]"}`} />
                </div>
                <p className="tnum mt-2 truncate font-mono text-xl font-semibold text-[#101828]">
                  {signer.address ? shortAddr(signer.address) : "Offline"}
                </p>
                <p className={`mt-1 text-[11px] ${signer.ready ? "text-[#12805C]" : "text-[#D92D20]"}`}>
                  {signer.ready ? "↑ Ready to sign" : "○ Not connected"}
                </p>
              </div>
              <div className="rounded-[24px] border border-[#DDE1EA] border-t-4 border-t-[#2E7CF6] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">Network</p>
                  <span className="h-2 w-2 rounded-full bg-[#2E7CF6]" />
                </div>
                <p className="tnum mt-2 truncate font-mono text-xl font-semibold text-[#101828]">
                  {netId === 137 ? "Polygon · 137" : "Base · 8453"}
                </p>
                <p className="mt-1 text-[11px] text-[#8A8D93]">Active network</p>
              </div>
              <div className="rounded-[24px] border border-[#DDE1EA] border-t-4 border-t-[#101828] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">Runs</p>
                  <span className="h-2 w-2 rounded-full bg-[#101828]" />
                </div>
                <p className="tnum mt-2 font-mono text-xl font-semibold text-[#101828]">{runs.length}</p>
                <p className="mt-1 text-[11px] text-[#8A8D93]">Broadcast total</p>
              </div>
              <div className="rounded-[24px] border border-[#DDE1EA] border-t-4 border-t-[#D92D20] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">Intercepted</p>
                  <span className="h-2 w-2 rounded-full bg-[#2E7CF6]" />
                </div>
                <p className="tnum mt-2 font-mono text-xl font-semibold text-[#101828]">{interceptedCount}</p>
                <p className="mt-1 text-[11px] text-[#8A8D93]">↑ Fraud stopped</p>
              </div>
            </section>
            <section className="rounded-[24px] border border-[#DDE1EA] bg-white p-4 lg:col-span-5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">Verdicts</h2>
                <span className="rounded-full bg-[#F4F6FA] px-2 py-1 font-mono text-[11px] text-[#5B6472]">
                  This console
                </span>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const total = Math.max(runs.length, 1);
                  const segs = [
                    { label: "Intercepted", count: interceptedCount, color: "#2E7CF6" },
                    { label: "Legitimate", count: legitCount, color: "#101828" },
                    { label: "Pending", count: pendingCount, color: "#DDE1EA" },
                  ];
                  const C = 2 * Math.PI * 54;
                  let acc = 0;
                  return (
                    <>
                      <svg
                        viewBox="0 0 140 140"
                        className="h-32 w-32 shrink-0"
                        role="img"
                        aria-label={`Verdicts: ${interceptedCount} intercepted, ${legitCount} legitimate, ${pendingCount} pending`}
                      >
                        <circle cx="70" cy="70" r="54" fill="none" stroke="#E6E9F0" strokeWidth="20" />
                        {segs.map((s) => {
                          const len = (s.count / total) * C;
                          const off = acc;
                          acc += len;
                          if (len <= 0) return null;
                          return (
                            <circle
                              key={s.label}
                              cx="70"
                              cy="70"
                              r="54"
                              fill="none"
                              stroke={s.color}
                              strokeWidth="20"
                              strokeDasharray={`${len} ${C - len}`}
                              strokeDashoffset={-off}
                              strokeLinecap="butt"
                              transform="rotate(-90 70 70)"
                            />
                          );
                        })}
                        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="600" fill="#101828">
                          {runs.length}
                        </text>
                        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#6B7280">
                          Total runs
                        </text>
                      </svg>
                      <ul className="min-w-0 flex-1 space-y-2">
                        {segs.map((s) => (
                          <li key={s.label} className="flex items-center gap-2 text-xs">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-[4px]"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="truncate text-[#5B6472]">{s.label}</span>
                            <span className="tnum ml-auto font-mono text-[#101828]">{s.count}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  );
                })()}
              </div>
            </section>
            <section className="rounded-[24px] border border-[#DDE1EA] bg-white p-4 lg:col-span-12">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                  Bitcoin · watch-only
                </h2>
                <p className="text-[11px] text-[#8A8D93]">
                  Native BTC cannot sign here — test with cbBTC / WBTC. Balance is read-only via
                  mempool.space.
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={btcAddr}
                  onChange={(e) => setBtcAddr(e.target.value)}
                  placeholder="bc1…"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-h-10 w-full min-w-0 flex-1 rounded-full border border-[#CBD1DE] bg-[#FFFFFF] px-3 font-mono text-sm text-[#101828] outline-none placeholder:text-[#AEB4C2] focus:border-[#B8E600]"
                />
                <button
                  type="button"
                  onClick={() => void checkBtc()}
                  disabled={btcLoading}
                  className="min-h-10 shrink-0 rounded-full bg-[#D7FF00] px-4 text-xs font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {btcLoading ? "Checking…" : "Check balance"}
                </button>
                {btcBal && <p className="tnum shrink-0 font-mono text-sm text-[#101828]">{btcBal}</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] p-4 lg:col-span-7">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-roboto text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">Treasury</h2>
                <button
                  type="button"
                  onClick={() => void refreshBalances()}
                  disabled={!canSign || balancesLoading}
                  className="font-roboto min-h-8 rounded-full border border-[#CBD1DE] px-3 text-[11px] text-[#101828] transition hover:border-[#B8E600] hover:text-[#0B0F14] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {balancesLoading ? "Loading…" : "Refresh"}
                </button>
              </div>
              {balancesLoading && !balances && (
                <ul className="space-y-2" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="h-4 animate-pulse rounded-full bg-[#E6E9F0]" />
                  ))}
                </ul>
              )}
              {!balances && (
                <p className="text-sm text-[#6B7280]">
                  {canSign ? "No balances loaded yet." : isAdmin ? "Connect a wallet to load balances." : "Sign in as admin to connect a wallet."}
                </p>
              )}
              {balances && (
                <ul className="divide-y divide-[#E6E9F0]">
                  {balances.map((b) => (
                    <li key={b.preset} className="flex items-center justify-between gap-2 py-2">
                      <span className="font-mono text-xs text-[#5B6472]">{b.symbol}</span>
                      <span className="truncate font-mono text-xs text-[#101828]">{b.display}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {isAdmin && (
            <section className="flex flex-col gap-2 rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] p-4 lg:col-span-5">
              <h2 className="font-roboto text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">Quick fire</h2>
              {(["mempoolLure", "zeroValue"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => void fire(v)}
                  disabled={!canSign || firing !== null}
                  className="font-roboto flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#D7FF00] px-4 text-sm text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {firing === v && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                  {v === "mempoolLure" ? "Mempool lure" : "Zero-value transfer"}
                </button>
              ))}
              <p className="text-[11px] leading-relaxed text-[#8A8D93]">
                Mempool lure uses starved gas and stays pending (never confirms) by design; other
                vectors use wallet-estimated gas and confirm normally.
              </p>
              {error && <p className="break-words text-xs text-[#D92D20]">{error}</p>}
            </section>
            )}
            <section className="rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] p-4 lg:col-span-7">
              <h2 className="font-roboto mb-3 text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">
                Recent activity
              </h2>
              {loadingRuns && (
                <ul className="space-y-2" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="h-4 animate-pulse rounded-full bg-[#E6E9F0]" />
                  ))}
                </ul>
              )}
              {!loadingRuns && runs.length === 0 && <p className="text-sm text-[#6B7280]">None yet.</p>}
              <ul className="divide-y divide-[#E6E9F0]">
                {runs.slice(0, 4).map((r) => (
                  <li key={r.txHash} className="flex items-center justify-between gap-2 py-2">
                    <a
                      href={r.explorerUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-xs text-[#101828] hover:text-[#2E7CF6]"
                    >
                      {shortHash(r.txHash)}
                    </a>
                    <span className="shrink-0 font-mono text-[11px] text-[#5B6472]">
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
        {tab === "vectors" && isAdmin && (
        <>
        <section className="col-span-12 min-w-0 rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] p-3 sm:p-4 lg:col-span-7">
          <LinkWallet onLinked={handleLinked} onUseAsTarget={useLinkedAsTarget} />
          <div className="mt-3 rounded-2xl border border-[#DDE1EA] bg-[#FFFFFF] p-3 sm:rounded-full">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5B6472]">
                Gas estimate
              </p>
              {gasLoading && <p className="text-[10px] text-[#6B7280]">Estimating…</p>}
              {gasLoading && !gasEst && (
                <div className="w-full space-y-2" aria-hidden>
                  <div className="h-3 animate-pulse rounded-full bg-[#E6E9F0]" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E6E9F0]" />
                </div>
              )}
            </div>
            {!gasEst && !gasLoading && (
              <p className="text-[10px] text-[#8A8D93]">Connect a wallet and set a target to preview gas.</p>
            )}
            {gasEst && (
              <ul className="space-y-2 font-mono text-[10px] text-[#374151] sm:space-y-1">
                <li className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <span className="min-w-0 break-words">Lure ({amountEth.trim() || "0.001"} ETH)</span>
                  <span className="shrink-0 tabular-nums">
                    {gasEst.lure.gasLimit} units ≈ {gasEst.lure.feeEth} ETH
                  </span>
                </li>
                <li className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <span className="min-w-0 break-words">Zero-value ({tokenPreset})</span>
                  <span className="shrink-0 tabular-nums">
                    {gasEst.zero.gasLimit} units ≈ {gasEst.zero.feeEth} ETH
                  </span>
                </li>
              </ul>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-[#8A8D93]">
              Lure broadcasts at a starved fee (stays pending); fee shown is at current price for
              reference.
            </p>
          </div>
        </section>

        <section className="col-span-12 flex min-w-0 flex-col gap-4 rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] p-3 sm:p-4 lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-roboto text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">
              Signer
            </p>
            {canSign && signer.address ? (
              <p className="max-w-full truncate font-mono text-[11px] text-[#12805C]">
                {signer.address.slice(0, 6)}…{signer.address.slice(-4)}
              </p>
            ) : (
              <p className="text-[11px] text-[#D92D20]">Offline</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-roboto text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">
              Network
            </p>
            <div className="flex flex-wrap gap-2">
              {([8453, 137] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setNetId(id);
                    if (tokenPreset !== "USDC" && !zeroValuePresetAddress(tokenPreset, id)) {
                      setTokenPreset("USDC");
                    }
                  }}
                  title={id === 137 ? "Polygon (POL for gas)" : "Base (ETH for gas)"}
                  className={`font-roboto min-h-8 rounded-full border px-3 text-[11px] transition ${
                    netId === id
                      ? "border-[#B8E600] bg-[#D7FF00] font-semibold text-[#0B0F14]"
                      : "border-[#CBD1DE] text-[#5B6472] hover:border-[#B8E600] hover:text-[#0B0F14]"
                  }`}
                >
                  {id === 137 ? "Polygon" : "Base"}
                </button>
              ))}
            </div>
          </div>
          <label className="font-roboto block min-w-0 text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">
            Target
            <input
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x…"
              className="mt-2 min-h-10 w-full min-w-0 rounded-full border border-[#CBD1DE] bg-[#FFFFFF] px-3 font-mono text-sm text-[#101828] outline-none placeholder:text-[#AEB4C2] focus:border-[#B8E600]"
            />
          </label>
          <label className="font-roboto block min-w-0 text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">
            Value (ETH · mempool lure)
            <input
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
              placeholder="0.001"
              inputMode="decimal"
              className="mt-2 min-h-10 w-full min-w-0 rounded-full border border-[#CBD1DE] bg-[#FFFFFF] px-3 font-mono text-sm text-[#101828] outline-none placeholder:text-[#AEB4C2] focus:border-[#B8E600]"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-roboto text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">
              Contract
            </p>
            <button
              type="button"
              onClick={() => void deployTestToken()}
              disabled={!canSign || deploying || firing !== null}
              className="font-roboto min-h-8 shrink-0 rounded-full border border-[#CBD1DE] px-3 text-[11px] text-[#101828] transition hover:border-[#B8E600] hover:text-[#0B0F14] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {deploying ? "Deploying…" : "Deploy"}
            </button>
          </div>
          <label className="block min-w-0" aria-label="Contract address">
            <input
              value={fakeTokenContract}
              onChange={(e) => setFakeTokenContract(e.target.value)}
              placeholder="0x…"
              className="min-h-10 w-full min-w-0 rounded-full border border-[#CBD1DE] bg-[#FFFFFF] px-3 font-mono text-sm text-[#101828] outline-none placeholder:text-[#AEB4C2] focus:border-[#B8E600]"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="font-roboto shrink-0 text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">
              Zero-value token
            </p>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {(Object.keys(ZERO_VALUE_PRESET_META) as ZeroValuePreset[]).filter((p) => zeroValuePresetAddress(p, netId) !== null).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTokenPreset(p)}
                  title={`${ZERO_VALUE_PRESET_META[p].blurb} (verified on-chain)`}
                  className={`font-roboto min-h-8 rounded-full border px-3 text-[11px] transition ${
                    tokenPreset === p
                      ? "border-[#B8E600] bg-[#D7FF00] font-semibold text-[#0B0F14]"
                      : "border-[#CBD1DE] text-[#5B6472] hover:border-[#B8E600] hover:text-[#0B0F14]"
                  }`}
                >
                  {p === "cbBTC" ? "cbBTC (BTC)" : p === "WBTC" ? "WBTC (BTC)" : p === "WPOL" ? "WPOL" : p === "cbLTC" ? "cbLTC (LTC)" : p}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-[#8A8D93]">
            Any ERC-20 works — paste its contract above (LTC-bridged, etc.), or pick a preset.
          </p>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-1">
            {VECTORS.map((v) => (
              <button
                key={v.id}
                onClick={() => void fire(v.id)}
                disabled={
                  !canSign ||
                  firing !== null ||
                  deploying ||
                  (v.needsContract && !fakeTokenContract.trim()) ||
                  (v.id === "mempoolLure" && noGas)
                }
                className="font-roboto flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#D7FF00] px-4 text-sm text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {firing === v.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                <span className="truncate">{v.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-[#8A8D93]">
            Mempool lure uses starved gas and stays pending (never confirms) by design; other
            vectors use wallet-estimated gas and confirm normally.
          </p>
          {noGas && (
            <p className="break-words text-[11px] text-[#B54708]">
              No {nativeSym} for gas on {netId === 137 ? "Polygon" : "Base"} — fund the signer or
              switch network above.
            </p>
          )}
          {error && <p className="break-words text-xs text-[#D92D20]">{error}</p>}
        </section>
        </>
        )}
        {tab === "runs" && (
        <section className="lg:col-span-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
              Runs
            </h2>
            <label
              className="flex w-full max-w-xs items-center gap-2 rounded-full border border-[#DDE1EA] bg-white px-3 py-2"
              aria-label="Search runs"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-[#8A8D93]" />
              <input
                value={runQuery}
                onChange={(e) => setRunQuery(e.target.value)}
                placeholder="Search runs…"
                className="w-full bg-transparent text-xs text-[#101828] outline-none placeholder:text-[#AEB4C2]"
              />
            </label>
          </div>
          {loadingRuns && (
            <ul className="flex flex-col gap-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className="rounded-[24px] border border-[#DDE1EA] bg-white p-4">
                  <div className="h-4 w-1/2 animate-pulse rounded-full bg-[#E6E9F0]" />
                  <div className="mt-2 h-3 w-1/3 animate-pulse rounded-full bg-[#E6E9F0]" />
                  <div className="mt-3 h-10 animate-pulse rounded-full bg-[#E6E9F0]" />
                </li>
              ))}
            </ul>
          )}
          {!loadingRuns && runs.length === 0 && <p className="text-sm text-[#6B7280]">None</p>}
          {!loadingRuns && runs.length > 0 && visibleRuns.length === 0 && (
            <p className="text-sm text-[#6B7280]">No runs match the current filter.</p>
          )}
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {visibleRuns.map((r) => {
                const intercepted = r.status === "FRAUD_INTERCEPTED";
                const verified = r.status === "VERIFIED_LEGITIMATE";
                const assessed = intercepted || verified;
                return (
                  <motion.li
                    key={r.txHash}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-[24px] border border-[#DDE1EA] bg-white p-4 border-l-4 ${
                      intercepted ? "border-l-[#2E7CF6]" : verified ? "border-l-[#101828]" : "border-l-[#DDE1EA]"
                    }`}
                  >
                    <a
                      href={r.explorerUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 font-mono text-sm text-[#101828] hover:text-[#2E7CF6]"
                    >
                      <span className="truncate">{shortHash(r.txHash)}</span>
                      <ArrowUpRight className="h-3 w-3 shrink-0" />
                    </a>
                    <p className="tnum mt-2 font-mono text-[11px] text-[#6B7280]">
                      {shortAddr(r.targetAddress)}
                      {typeof r.threatScore === "number" ? ` · score ${r.threatScore}` : ""}
                      {r.chainId === 137 ? " · Polygon" : ""}
                    </p>
                    {assessed ? (
                      intercepted ? (
                        <p className="mt-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#D6EFD0] px-2 py-1 text-[11px] font-medium text-[#2E7D32]">
                            ● Fraud intercepted
                          </span>
                        </p>
                      ) : (
                        <p className="mt-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E6E9F0] px-2 py-1 text-[11px] font-medium text-[#374151]">
                            ● Verified legitimate
                          </span>
                        </p>
                      )
                    ) : (
                      <button
                        onClick={() => void verify(r.txHash)}
                        disabled={verifying === r.txHash}
                        className="mt-3 min-h-10 w-full rounded-full bg-[#D7FF00] px-4 text-xs font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:opacity-40"
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
        <details className="rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] p-4 lg:col-span-12">
          <summary className="font-roboto cursor-pointer text-[11px] uppercase tracking-[0.16em] text-[#5B6472]">
            Settings
          </summary>
          <div className="mt-4">
            <AdminSettingsPanel role={isAdmin ? "admin" : "staff"} />
          </div>
        </details>
        )}
      </main>
      </div>
      <nav
        className="fixed inset-x-3 bottom-3 z-20 flex items-center justify-around rounded-full border border-transparent bg-[#101828] px-2 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] md:hidden"
        aria-label="Admin sections"
      >
        {navTabs.map(({ id, Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-full border border-white/15 px-3 py-1 text-[10px] transition ${
              tab === id ? "bg-[#D7FF00] text-[#0B0F14]" : "text-[#D7FF00]/60"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
