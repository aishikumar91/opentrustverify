"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "../lib/basePath";

type YesNo = "YES" | "NO";

type SettingsPayload = {
  rpc: YesNo;
  mainnet: YesNo;
  allowlist: YesNo;
  chainId: number;
  chainName: string;
  rpcSource: string | null;
};

const FLAGS: { key: keyof Pick<SettingsPayload, "rpc" | "mainnet" | "allowlist">; label: string }[] = [
  { key: "rpc", label: "RPC" },
  { key: "mainnet", label: "MAINNET" },
  { key: "allowlist", label: "ALLOWLIST" },
];

export default function AdminSettingsPanel() {
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(withBasePath("/api/admin/settings"), { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
        if (!cancelled) setSettings(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-10 overflow-hidden rounded-xl border border-[#1C2430] bg-[#0D121A]/p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[#8A95A5]">
            Admin settings
          </h2>
          <p className="mt-1 text-xs text-[#5A6575]">
            Live status from server env — not client guesses.
          </p>
        </div>
        {settings && (
          <p className="font-mono text-[11px] text-[#5A6575]">
            {settings.chainName} · {settings.chainId}
            {settings.rpcSource ? ` · ${settings.rpcSource}` : ""}
          </p>
        )}
      </div>

      {error && <p className="text-xs text-[#FF5C6C]">{error}</p>}

      {!settings && !error && (
        <p className="text-xs text-[#5A6575]">Loading settings…</p>
      )}

      {settings && (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          {FLAGS.map(({ key, label }) => {
            const value = settings[key];
            const on = value === "YES";
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 border-b border-[#171B22] pb-3 min-[420px]:border-b-0 min-[420px]:pb-0"
              >
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#B9C4CE]">
                  {label}
                </span>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs font-semibold tracking-wide ${
                    on
                      ? "bg-[#E11D48]/20 text-[#FF6B81]"
                      : "bg-[#171B22] text-[#6B7686]"
                  }`}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
