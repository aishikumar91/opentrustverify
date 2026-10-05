"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUpRight } from "lucide-react";
import { withBasePath } from "../lib/basePath";
import LinkWallet from "./LinkWallet";
import BrandMark from "./BrandMark";
import AdminSettingsPanel from "./AdminSettingsPanel";

type Vector = "mempoolLure" | "addressPoisoning" | "fakeTokenTransfer";

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

const VECTORS: { id: Vector; label: string }[] = [
  { id: "mempoolLure", label: "Mempool lure" },
  { id: "addressPoisoning", label: "Address poisoning" },
  { id: "fakeTokenTransfer", label: "Unverified token transfer" },
];

function shortHash(h: string) {
  if (!h || h.length < 14) return h;
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

function shortAddr(a: string) {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function OpenTrustDashboard() {
  const [targetAddress, setTargetAddress] = useState("");
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);
  const [fakeTokenContract, setFakeTokenContract] = useState("");
  const [firing, setFiring] = useState<Vector | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [runs, setRuns] = useState<ExecutedRunView[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setLinkedAddress(address);
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
      const res = await fetch(withBasePath("/api/admin/execute-attack"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vector, targetAddress, fakeTokenContract }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Trigger failed");
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(225,29,72,0.18),_transparent_60%)]" />
      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 md:px-8 md:py-20">
        <header className="mb-10 sm:mb-14">
          <BrandMark size="lg" as="h1" />
          <p className="brand-fade-up mt-4 max-w-md text-sm text-[#8A95A5]">
            Live interception console — verified on-chain, allowlist-scoped.
          </p>
          <a
            href={withBasePath("/api/auth/logout")}
            className="mt-4 inline-block text-xs text-[#6B7686] transition hover:text-[#E11D48]"
          >
            Sign out
          </a>
        </header>

        <AdminSettingsPanel />

        <section className="mb-14 sm:mb-16">
          <div className="mb-8 border-b border-[#171B22] pb-8">
            <LinkWallet onLinked={handleLinked} onUseAsTarget={useLinkedAsTarget} />
            {linkedAddress && targetAddress.toLowerCase() === linkedAddress.toLowerCase() && (
              <p className="mt-3 text-xs text-[#6B7686]">
                Target uses the linked wallet. It must also be present in ADMIN_ALLOWLIST.
              </p>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs text-[#6B7686]">Target wallet</label>
              <input
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="0x…"
                className="mt-1 w-full min-w-0 border-0 border-b border-[#20242C] bg-transparent py-2 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4150] focus:border-[#E11D48]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7686]">
                Token contract (poisoning / transfer vectors)
              </label>
              <input
                value={fakeTokenContract}
                onChange={(e) => setFakeTokenContract(e.target.value)}
                placeholder="0x…"
                className="mt-1 w-full min-w-0 border-0 border-b border-[#20242C] bg-transparent py-2 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4150] focus:border-[#E11D48]"
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
            {VECTORS.map((v) => (
              <button
                key={v.id}
                onClick={() => fire(v.id)}
                disabled={!targetAddress || firing !== null}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#E11D48] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {firing === v.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                <span className="text-center leading-snug">{v.label}</span>
              </button>
            ))}
          </div>

          {error && <p className="mt-4 break-words text-xs text-[#FF5C6C]">{error}</p>}
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xs uppercase tracking-[0.16em] text-[#6B7686]">
              Executed runs
            </h2>
            <p className="text-[11px] text-[#5A6575]">Persisted in Postgres · loads on open</p>
          </div>

          {loadingRuns && <p className="text-sm text-[#6B7686]">Loading runs…</p>}

          {!loadingRuns && runs.length === 0 && (
            <p className="text-sm text-[#6B7686]">No executed runs yet.</p>
          )}

          <ul className="divide-y divide-[#171B22]">
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
                    className="py-5"
                  >
                    <div
                      className={`overflow-hidden rounded-xl border p-4 sm:p-5 ${
                        intercepted
                          ? "border-[#E11D48]/40 bg-[linear-gradient(135deg,rgba(225,29,72,0.16),rgba(10,14,20,0.4))]"
                          : verified
                            ? "border-[#35D398]/25 bg-[linear-gradient(135deg,rgba(53,211,152,0.08),rgba(10,14,20,0.3))]"
                            : "border-[#1C2430] bg-[#0D121A]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <a
                            href={r.explorerUrl || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1 font-mono text-sm text-[#ECEFF3] hover:text-[#E11D48]"
                          >
                            <span className="truncate">{shortHash(r.txHash)}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0 text-[#6B7686]" />
                          </a>
                          <p className="break-all font-mono text-[11px] text-[#5A6575] sm:break-normal">
                            {shortAddr(r.targetAddress)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-[#6B7686]">
                          <span className="rounded bg-[#171B22] px-2 py-0.5 font-mono uppercase tracking-wide text-[#B9C4CE]">
                            {r.vector}
                          </span>
                          <span>{formatWhen(r.broadcastAt)}</span>
                        </div>
                      </div>

                      {assessed ? (
                        <div className="mt-4 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                intercepted ? "bg-[#FF5C6C]" : "bg-[#35D398]"
                              }`}
                            />
                            <p className="text-sm font-medium text-[#ECEFF3]">
                              {intercepted ? "Fraud intercepted" : "Verified legitimate"}
                            </p>
                            {typeof r.threatScore === "number" && (
                              <span className="font-mono text-xs text-[#8A95A5]">
                                threat {r.threatScore}/100
                              </span>
                            )}
                            {r.actionRecommended && (
                              <span className="rounded border border-[#20242C] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#8A95A5]">
                                {r.actionRecommended}
                              </span>
                            )}
                          </div>
                          {r.reasons?.length > 0 && (
                            <ul className="space-y-1 text-xs text-[#8A95A5]">
                              {r.reasons.map((reason, i) => (
                                <li key={i} className="break-words">
                                  · {reason}
                                </li>
                              ))}
                            </ul>
                          )}
                          {r.realBalanceImpact != null && (
                            <p className="font-mono text-[11px] text-[#5A6575]">
                              balance impact: {r.realBalanceImpact}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => verify(r.txHash)}
                          disabled={verifying === r.txHash}
                          className="mt-4 min-h-[40px] rounded-full bg-[#E11D48] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#F43F5E] disabled:opacity-40"
                        >
                          {verifying === r.txHash ? "Scanning…" : "Verify"}
                        </button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>

        <footer className="mt-16 text-xs text-[#3A4150]">
          Targets restricted to ADMIN_ALLOWLIST · 3GGER
        </footer>
      </div>
    </div>
  );
}
