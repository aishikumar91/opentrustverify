"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "../lib/basePath";

type YesNo = "YES" | "NO";

type SettingsPayload = {
  rpc: YesNo;
  mainnet: YesNo;
  allowlist: YesNo;
  walletConnect: YesNo;
  chainId: number;
  chainName: string;
  rpcSource: string | null;
  walletConnectProjectId: string;
  walletConnectConfigured: boolean;
  walletConnectSource: "database" | "env" | "none";
};

const FLAGS: {
  key: keyof Pick<SettingsPayload, "rpc" | "mainnet" | "allowlist" | "walletConnect">;
  label: string;
  shortLabel: string;
}[] = [
  { key: "rpc", label: "RPC", shortLabel: "RPC" },
  { key: "mainnet", label: "MAINNET", shortLabel: "MAINNET" },
  { key: "allowlist", label: "ALLOWLIST", shortLabel: "ALLOWLIST" },
  { key: "walletConnect", label: "WALLETCONNECT", shortLabel: "WC" },
];

export default function AdminSettingsPanel() {
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [projectIdDraft, setProjectIdDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(withBasePath("/api/admin/settings"), { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
        if (!cancelled) {
          setSettings(data);
          setProjectIdDraft(data.walletConnectProjectId ?? "");
        }
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

  async function saveWalletConnect() {
    setError(null);
    setSaveMsg(null);
    setSaving(true);
    try {
      const res = await fetch(withBasePath("/api/admin/settings"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletConnectProjectId: projectIdDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSettings(data);
      setProjectIdDraft(data.walletConnectProjectId ?? "");
      setSaveMsg(
        data.walletConnectConfigured
          ? `WalletConnect saved (${data.walletConnectSource}). Connect wallets below without restarting.`
          : "Cleared DB project id. Env fallback still applies if set on the VPS."
      );
      // Notify LinkWallet (sibling) to re-fetch /api/config/public.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("otv-admin-settings-updated"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8 overflow-x-hidden rounded-xl border border-[#1C2430] bg-[#0D121A] p-3.5 sm:mb-10 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[#8A95A5]">
            Admin settings
          </h2>
          <p className="mt-1 break-words text-xs leading-relaxed text-[#5A6575]">
            Live status from server — WalletConnect project id persists in Postgres (DB over
            env). Passkeys link under Linked wallet (credential id + public key only).
          </p>
        </div>
        {settings && (
          <p className="max-w-full break-all font-mono text-[11px] leading-relaxed text-[#5A6575] sm:break-normal sm:text-right">
            {settings.chainName} · {settings.chainId}
            {settings.rpcSource ? ` · ${settings.rpcSource}` : ""}
          </p>
        )}
      </div>

      {error && <p className="mb-3 break-words text-xs text-[#FF5C6C]">{error}</p>}
      {saveMsg && <p className="mb-3 break-words text-xs text-[#8A95A5]">{saveMsg}</p>}

      {!settings && !error && (
        <p className="text-xs text-[#5A6575]">Loading settings…</p>
      )}

      {settings && (
        <>
          {/* Wrap status chips — never force 3/4 cramped columns on phone widths */}
          <div className="mb-5 flex flex-wrap gap-2">
            {FLAGS.map(({ key, label, shortLabel }) => {
              const value = settings[key];
              const on = value === "YES";
              return (
                <div
                  key={key}
                  className="inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-2 rounded-lg border border-[#1C2430] bg-[#0A0E14] px-3 py-2"
                  title={label}
                >
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#B9C4CE] sm:text-xs sm:tracking-[0.14em]">
                    <span className="sm:hidden">{shortLabel}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded px-2 py-1 font-mono text-xs font-semibold tracking-wide ${
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

          <div className="space-y-2 border-t border-[#171B22] pt-4">
            <label
              htmlFor="wc-project-id"
              className="block text-xs font-medium uppercase tracking-[0.14em] text-[#B9C4CE]"
            >
              WalletConnect project ID
            </label>
            <p className="break-words text-xs leading-relaxed text-[#5A6575]">
              Paste from{" "}
              <a
                href="https://cloud.walletconnect.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#E11D48] underline-offset-2 hover:underline"
              >
                cloud.walletconnect.com
              </a>
              . Source:{" "}
              <span className="font-mono text-[#8A95A5]">{settings.walletConnectSource}</span>
              . Empty clears the DB override (env still used if set).
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="wc-project-id"
                type="text"
                value={projectIdDraft}
                onChange={(e) => setProjectIdDraft(e.target.value)}
                placeholder="WalletConnect Cloud project id"
                autoComplete="off"
                spellCheck={false}
                className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-[#20242C] bg-[#0A0E14] px-3 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4450] focus:border-[#E11D48]"
              />
              <button
                type="button"
                onClick={() => void saveWalletConnect()}
                disabled={saving}
                className="min-h-[44px] w-full shrink-0 rounded-full bg-[#E11D48] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
