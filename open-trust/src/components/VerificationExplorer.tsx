"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { withBasePath } from "../lib/basePath";

interface Assessment {
  txHash: string;
  status: "FRAUD_INTERCEPTED" | "VERIFIED_LEGITIMATE";
  threatScore: number;
  vector: string;
  realBalanceImpact: string;
  reasons: string[];
  actionRecommended: "BLOCK_INTERCEPT" | "PASS";
}

export default function VerificationExplorer() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);

  async function runVerification(e: React.FormEvent) {
    e.preventDefault();
    const txHash = input.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      setError("Enter a full transaction hash (0x… 66 characters).");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(withBasePath(`/api/verify/${txHash}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="explorer" className="mx-auto max-w-2xl">
      <form onSubmit={runVerification} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7686]" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a transaction hash — 0x…"
            className="w-full rounded-full border border-[#20242C] bg-[#10141C] py-3 pl-11 pr-4 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4150] focus:border-[#E11D48]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[48px] shrink-0 items-center justify-center rounded-full bg-[#E11D48] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
        </button>
      </form>

      {error && <p className="mt-3 break-words text-sm text-[#FF5C6C]">{error}</p>}

      {result && (
        <div
          className={`mt-6 overflow-hidden rounded-2xl border p-4 sm:p-6 ${
            result.status === "FRAUD_INTERCEPTED"
              ? "border-[#E11D48]/40 bg-[linear-gradient(135deg,rgba(225,29,72,0.16),rgba(16,20,28,0.9))]"
              : "border-[#20242C] bg-[#10141C]"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                result.status === "FRAUD_INTERCEPTED" ? "bg-[#FF5C6C]" : "bg-[#35D398]"
              }`}
            />
            <p className="text-base font-medium">
              {result.status === "FRAUD_INTERCEPTED" ? "Fraud intercepted" : "Verified legitimate"}
            </p>
            <span className="ml-auto font-mono text-sm text-[#6B7686]">
              {result.threatScore}/100
            </span>
          </div>
          <p className="mt-1 break-all font-mono text-xs text-[#6B7686]">{result.txHash}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-[#B9C4CE]">
            {result.reasons.map((r, i) => (
              <li key={i} className="break-words">
                · {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
