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
  chainId: number;
  chainName: string;
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
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
  const onLinkedRef = useRef(onLinked);
  onLinkedRef.current = onLinked;

  useEffect(() => {
    let cancelled = false;
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
            chainId: 8453,
            chainName: "Base",
          });
        }
      });
    return () => {
      cancelled = true;
    };
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
      const provider = window.ethereum;
      if (!provider) {
        setError("No injected wallet found. Install MetaMask or use WalletConnect.");
        return;
      }
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      applyAddress(accounts[0], "injected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Injected wallet connection failed.");
    } finally {
      setBusy(null);
    }
  }

  async function connectWalletConnect() {
    setError(null);
    const projectId = config?.walletConnectProjectId;
    if (!projectId) {
      setError(
        "WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID " +
          "(or VITE_WALLETCONNECT_PROJECT_ID on the VPS) and restart the trigger service."
      );
      return;
    }
    setBusy("walletconnect");
    try {
      const imported = await import("@walletconnect/ethereum-provider");
      const EthereumProvider = imported.default;
      const chainId = config?.chainId || 8453;
      const provider = await EthereumProvider.init({
        projectId,
        optionalChains: [chainId, 8453, 1, 137],
        showQrModal: true,
        metadata: {
          name: "3GGE Admin",
          description: "Link an allowlisted wallet for 3GGE trigger vectors",
          url: process.env.NEXT_PUBLIC_SITE_URL || "https://otv.poptrust.me",
          icons: ["https://otv.poptrust.me/favicon.svg"],
        },
      });
      await provider.connect();
      applyAddress(provider.accounts[0], "walletconnect");
    } catch (err) {
      setError(err instanceof Error ? err.message : "WalletConnect did not connect.");
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
        <div className="flex w-full flex-col gap-2 min-[420px]:w-auto min-[420px]:flex-row min-[420px]:flex-wrap">
          {!wallet ? (
            <>
              <button
                type="button"
                onClick={() => void connectInjected()}
                disabled={busy !== null}
                className="min-h-[44px] rounded-full bg-[#E11D48] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30"
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
                    : "Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (or VITE_WALLETCONNECT_PROJECT_ID) to enable"
                }
                className="min-h-[44px] rounded-full border border-[#20242C] bg-transparent px-4 py-2 text-sm font-medium text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {busy === "walletconnect" ? "Connecting…" : "WalletConnect"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onUseAsTarget(wallet.address)}
                className="min-h-[44px] rounded-full bg-[#E11D48] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E]"
              >
                Use as target
              </button>
              <button
                type="button"
                onClick={disconnect}
                className="min-h-[44px] rounded-full border border-[#20242C] px-4 py-2 text-sm text-[#6B7686] transition hover:border-[#E11D48] hover:text-[#E11D48]"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {config && !wcReady && (
        <p className="text-xs text-[#6B7686]">
          WalletConnect disabled — set{" "}
          <span className="font-mono text-[#ECEFF3]">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</span>{" "}
          (map from{" "}
          <span className="font-mono text-[#ECEFF3]">VITE_WALLETCONNECT_PROJECT_ID</span> on the
          VPS) and restart. MetaMask / injected wallets still work.
        </p>
      )}
      {error && <p className="text-xs text-[#FF5C6C]">{error}</p>}
    </div>
  );
}
