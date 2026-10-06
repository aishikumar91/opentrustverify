"use client";

import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { withBasePath } from "../lib/basePath";

type LinkedWallet = {
  address: string;
  source: "injected" | "walletconnect";
};

type PublicConfig = {
  walletConnectProjectId: string;
  walletConnectConfigured: boolean;
  walletConnectSource?: "database" | "env" | "none";
  chainId: number;
  chainName: string;
};

type EthereumProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  providers?: EthereumProviderLike[];
  isMetaMask?: boolean;
};

declare global {
  interface Window {
    ethereum?: EthereumProviderLike;
  }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Prefer MetaMask / Rabby when multiple injected providers are present. */
function getInjectedProvider(): EthereumProviderLike | null {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return (
      eth.providers.find((p) => p?.isMetaMask) ||
      eth.providers[0] ||
      eth
    );
  }
  return eth;
}

type Props = {
  onLinked: (address: string | null) => void;
  onUseAsTarget: (address: string) => void;
};

export default function LinkWallet({ onLinked, onUseAsTarget }: Props) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [wallet, setWallet] = useState<LinkedWallet | null>(null);
  const [busy, setBusy] = useState<"injected" | "walletconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInjected, setHasInjected] = useState(false);
  const onLinkedRef = useRef(onLinked);
  onLinkedRef.current = onLinked;

  useEffect(() => {
    let cancelled = false;
    function loadConfig() {
      void fetch(withBasePath("/api/config/public"))
        .then((res) => res.json())
        .then((data: PublicConfig) => {
          if (!cancelled) setConfig(data);
        })
        .catch(() => {
          if (!cancelled) {
            setConfig({
              walletConnectProjectId: "",
              walletConnectConfigured: false,
              walletConnectSource: "none",
              chainId: 8453,
              chainName: "Base",
            });
          }
        });
    }
    loadConfig();
    const onSettingsUpdated = () => loadConfig();
    window.addEventListener("otv-admin-settings-updated", onSettingsUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("otv-admin-settings-updated", onSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    setHasInjected(Boolean(getInjectedProvider()));
  }, []);

  useEffect(() => {
    onLinkedRef.current(wallet?.address ?? null);
  }, [wallet]);

  function applyAddress(raw: string, source: LinkedWallet["source"]) {
    if (!raw || !isAddress(raw)) {
      throw new Error("Wallet did not return a valid EVM address.");
    }
    const address = getAddress(raw);
    setWallet({ address, source });
    setError(null);
  }

  async function connectInjected() {
    setError(null);
    setBusy("injected");
    try {
      const provider = getInjectedProvider();
      if (!provider) {
        const wcReady = Boolean(config?.walletConnectConfigured);
        setError(
          wcReady
            ? "No browser wallet detected. Install MetaMask/Rabby, or use WalletConnect."
            : "No browser wallet detected, and WalletConnect is not configured. Install MetaMask/Rabby, or paste a WalletConnect project ID in Admin settings."
        );
        return;
      }
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) {
        throw new Error("No accounts returned. Unlock MetaMask and try again.");
      }
      applyAddress(accounts[0], "injected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Injected wallet connection failed.");
    } finally {
      setBusy(null);
    }
  }

  async function connectWalletConnect() {
    setError(null);
    // Re-fetch runtime config so a freshly saved Admin project id is picked up
    // without a full page reload.
    let projectId = config?.walletConnectProjectId ?? "";
    let chainId = config?.chainId || 8453;
    try {
      const res = await fetch(withBasePath("/api/config/public"));
      if (res.ok) {
        const fresh = (await res.json()) as PublicConfig;
        setConfig(fresh);
        projectId = fresh.walletConnectProjectId || "";
        chainId = fresh.chainId || chainId;
      }
    } catch {
      // keep prior config
    }

    if (!projectId) {
      setError(
        "WalletConnect is not configured. Paste a project ID from cloud.walletconnect.com in Admin settings (or set VITE_WALLETCONNECT_PROJECT_ID on the VPS)."
      );
      return;
    }
    setBusy("walletconnect");
    try {
      const imported = await import("@walletconnect/ethereum-provider");
      const EthereumProvider = imported.default;
      const provider = await EthereumProvider.init({
        projectId,
        optionalChains: [chainId, 8453, 1, 137],
        showQrModal: true,
        metadata: {
          name: "3GGA Admin",
          description: "Link an allowlisted wallet for 3GGA trigger vectors",
          url:
            typeof window !== "undefined"
              ? window.location.origin
              : process.env.NEXT_PUBLIC_SITE_URL || "https://otv.poptrust.me",
          icons: ["https://otv.poptrust.me/favicon.svg"],
        },
      });
      await provider.connect();
      const account = provider.accounts?.[0];
      if (!account) {
        throw new Error("WalletConnect session opened but no account was returned.");
      }
      applyAddress(account, "walletconnect");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "WalletConnect did not connect.";
      // User closed modal — soft message
      if (/user rejected|closed|cancel/i.test(msg)) {
        setError("WalletConnect cancelled.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  function disconnect() {
    setWallet(null);
    setError(null);
  }

  const wcReady = Boolean(config?.walletConnectConfigured);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-[#6B7686]">Linked wallet</p>
          {wallet ? (
            <p className="mt-1 break-all font-mono text-sm text-[#ECEFF3] sm:break-normal">
              {shortAddress(wallet.address)}
              <span className="ml-2 text-xs text-[#6B7686]">
                {wallet.source === "walletconnect" ? "WalletConnect" : "Injected"}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#6B7686]">No wallet linked</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {!wallet ? (
            <>
              <button
                type="button"
                onClick={() => void connectInjected()}
                disabled={busy !== null}
                title={
                  hasInjected
                    ? "Connect MetaMask / injected wallet"
                    : "Requires MetaMask or another injected wallet in this browser"
                }
                className="min-h-[44px] w-full rounded-full bg-[#E11D48] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "injected" ? "Connecting…" : "Connect MetaMask"}
              </button>
              <button
                type="button"
                onClick={() => void connectWalletConnect()}
                disabled={busy !== null || !wcReady}
                title={
                  wcReady
                    ? "Connect with WalletConnect"
                    : "Set a WalletConnect project ID in Admin settings to enable"
                }
                className="min-h-[44px] w-full rounded-full border border-[#20242C] bg-transparent px-4 py-2 text-sm font-medium text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "walletconnect" ? "Connecting…" : "WalletConnect"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onUseAsTarget(wallet.address)}
                className="min-h-[44px] w-full rounded-full bg-[#E11D48] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E] sm:w-auto"
              >
                Use as target
              </button>
              <button
                type="button"
                onClick={disconnect}
                className="min-h-[44px] w-full rounded-full border border-[#20242C] px-4 py-2 text-sm text-[#6B7686] transition hover:border-[#E11D48] hover:text-[#E11D48] sm:w-auto"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {config && !wcReady && (
        <p className="break-words text-xs leading-relaxed text-[#6B7686]">
          WalletConnect disabled — paste a project ID from{" "}
          <a
            href="https://cloud.walletconnect.com"
            target="_blank"
            rel="noreferrer"
            className="text-[#E11D48] underline-offset-2 hover:underline"
          >
            cloud.walletconnect.com
          </a>{" "}
          in Admin settings above (saved to Postgres; no image rebuild). MetaMask / injected
          wallets still work when available in this browser.
        </p>
      )}
      {error && <p className="break-words text-xs text-[#FF5C6C]">{error}</p>}
    </div>
  );
}
