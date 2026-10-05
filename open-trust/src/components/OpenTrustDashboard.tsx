"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUpRight } from "lucide-react";
import { withBasePath } from "../lib/basePath";
import LinkWallet from "./LinkWallet";

type Vector = "mempoolLure" | "addressPoisoning" | "fakeTokenTransfer";

interface TriggerRecord {
  txHash: string;
  explorerUrl: string;
  vector: string;
  targetAddress: string;
  broadcastAt: string;
}

interface Assessment {
  txHash: string;
  status: "FRAUD_INTERCEPTED" | "VERIFIED_LEGITIMATE";
  threatScore: number;
  vector: string;
  realBalanceImpact: string;
  reasons: string[];
  actionRecommended: "BLOCK_INTERCEPT" | "PASS";
}

const VECTORS: { id: Vector; label: string }[] = [
  { id: "mempoolLure", label: "Mempool lure" },
  { id: "addressPoisoning", label: "Address poisoning" },
  { id: "fakeTokenTransfer", label: "Unverified token transfer" },
];

function shortHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export default function OpenTrustDashboard() {
  const [targetAddress, setTargetAddress] = useState("");
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);
  const [fakeTokenContract, setFakeTokenContract] = useState("");
  const [firing, setFiring] = useState<Vector | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [records, setRecords] = useState<TriggerRecord[]>([]);
  const [assessments, setAssessments] = useState<Record<string, Assessment>>({});
  const [error, setError] = useState<string | null>(null);

  function handleLinked(address: string | null) {
    setLinkedAddress(address);
    if (address) setTargetAddress(address);
  }

  function useLinkedAsTarget(address: string) {
    setTargetAddress(address);
  }

  async function fire(vector: Vector) {
    setError(null);
    setFiring(vector);
    try {
      const res = await fetch(withBasePath("/api/admin/execute-attack"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vector, targetAddress, fakeTokenContract }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Trigger failed");
      setRecords((prev) => [data, ...prev]);
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
      setAssessments((prev) => ({ ...prev, [txHash]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setVerifying(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0E14] text-[#ECEFF3] antialiased">
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-24">
        <header className="mb-16">
          <h1 className="text-2xl font-medium tracking-tight" style={{ fontFamily: "'Urbanist', sans-serif" }}>
            Open Trust
          </h1>
          <p className="mt-2 text-sm text-[#6B7686]" style={{ fontFamily: "'Roboto', sans-serif" }}>
            Live interception, verified on-chain.
          </p>
          <a href={withBasePath("/api/auth/logout")} className="mt-3 inline-block text-xs text-[#6B7686] hover:text-[#E11D48]">
            Sign out
          </a>
        </header>

        <section className="mb-20">
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
                className="mt-1 w-full border-0 border-b border-[#20242C] bg-transparent py-2 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4150] focus:border-[#E11D48]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7686]">Token contract (poisoning / transfer vectors)</label>
              <input
                value={fakeTokenContract}
                onChange={(e) => setFakeTokenContract(e.target.value)}
                placeholder="0x…"
                className="mt-1 w-full border-0 border-b border-[#20242C] bg-transparent py-2 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4150] focus:border-[#E11D48]"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {VECTORS.map((v) => (
              <button
                key={v.id}
                onClick={() => fire(v.id)}
                disabled={!targetAddress || firing !== null}
                className="flex items-center gap-2 rounded-full border border-[#20242C] bg-[#E11D48] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {firing === v.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {v.label}
              </button>
            ))}
          </div>

          {error && <p className="mt-4 text-xs text-[#FF5C6C]">{error}</p>}
        </section>

        <section>
          <h2 className="mb-6 text-xs uppercase tracking-wide text-[#6B7686]">Ledger</h2>

          {records.length === 0 && (
            <p className="text-sm text-[#6B7686]">Nothing fired yet.</p>
          )}

          <ul className="divide-y divide-[#171B22]">
            <AnimatePresence initial={false}>
              {records.map((r) => {
                const a = assessments[r.txHash];
                return (
                  <motion.li
                    key={r.txHash}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-5"
                  >
                    <div className="flex items-center justify-between">
                      <a
                        href={r.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-sm text-[#ECEFF3] hover:text-[#E11D48]"
                      >
                        {shortHash(r.txHash)}
                        <ArrowUpRight className="h-3 w-3 text-[#6B7686]" />
                      </a>
                      <span className="text-xs text-[#6B7686]">{r.vector}</span>
                    </div>

                    {a ? (
                      <div className="mt-3 flex items-start gap-2 text-xs">
                        <span
                          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                            a.status === "FRAUD_INTERCEPTED" ? "bg-[#FF5C6C]" : "bg-[#35D398]"
                          }`}
                        />
                        <div>
                          <p className="text-[#ECEFF3]">
                            {a.status === "FRAUD_INTERCEPTED" ? "Fraud intercepted" : "Verified legitimate"}
                            <span className="ml-2 text-[#6B7686]">{a.threatScore}/100</span>
                          </p>
                          <p className="mt-1 text-[#6B7686]">{a.reasons.join(" · ")}</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => verify(r.txHash)}
                        disabled={verifying === r.txHash}
                        className="mt-3 rounded-full bg-[#E11D48] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#F43F5E] disabled:opacity-40"
                      >
                        {verifying === r.txHash ? "Scanning…" : "Verify"}
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>

        <footer className="mt-20 text-xs text-[#3A4150]">
          Targets restricted to ADMIN_ALLOWLIST.
        </footer>
      </div>
    </div>
  );
}
