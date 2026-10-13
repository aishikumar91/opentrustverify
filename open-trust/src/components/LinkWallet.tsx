"use client";

import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { withBasePath } from "../lib/basePath";
import { walletErrorMessage } from "../lib/walletErrors";
import {
  getInjectedProvider,
  setActiveWalletProvider,
  type Eip1193Provider,
} from "../lib/walletProvider";

type LinkedWallet = {
  address: string;
  source: "injected" | "walletconnect" | "sectool";
};

type PublicConfig = {
  walletConnectProjectId: string;
  walletConnectConfigured: boolean;
  walletConnectSource?: "database" | "env" | "none";
  chainId: number;
  chainName: string;
  sectool?: {
    projectName: string;
    clientId: string;
    network: string;
    configured: boolean;
  };
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.OTV_PUBLIC_URL || "https://otv.poptrust.me").replace(
    /\/$/,
    ""
  );
}

function wcMetadata() {
  const origin = siteOrigin();
  return {
    name: "3GGA Admin",
    description: "3GGA fraud console",
    url: origin,
    icons: [`${origin}${withBasePath("/logo.png")}`, `${origin}${withBasePath("/icon-192.png")}`],
  };
}

const WC_RPC_MAP: Record<string, string> = {
  "1": "https://cloudflare-eth.com",
  "8453": "https://mainnet.base.org",
  "137": "https://polygon.publicnode.com",
};

type WcProviderLike = Eip1193Provider & {
  accounts?: string[];
  session?: {
    topic?: string;
    pairingTopic?: string;
    namespaces?: { eip155?: { accounts?: string[] } };
  };
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  off?: (event: string, cb: (...args: unknown[]) => void) => void;
  connect?: (opts?: { pairingTopic?: string }) => Promise<void>;
};

async function initWalletConnectProvider(projectId: string, chainId: number, showQrModal = false) {
  const imported = await import("@walletconnect/ethereum-provider");
  const EthereumProvider = imported.default;
  const primary = chainId || 8453;
  const optional = [8453, 1, 137].filter((id) => id !== primary);
  return EthereumProvider.init({
    projectId,
    chains: [primary],
    optionalChains: optional,
    showQrModal,
    rpcMap: WC_RPC_MAP,
    metadata: wcMetadata(),
  }) as Promise<WcProviderLike>;
}

/** Pull a checksummed address after WalletConnect connect/session restore. */
async function resolveWcAccount(provider: WcProviderLike): Promise<string> {
  const candidates: string[] = [];
  if (Array.isArray(provider.accounts)) {
    candidates.push(...provider.accounts);
  }
  try {
    const ns = provider.session?.namespaces?.eip155?.accounts;
    if (Array.isArray(ns)) {
      for (const entry of ns) {
        if (typeof entry !== "string") continue;
        const addr = entry.includes(":") ? entry.split(":").pop() || "" : entry;
        if (addr) candidates.push(addr);
      }
    }
  } catch {
    /* non-fatal */
  }

  for (const raw of candidates) {
    if (raw && isAddress(raw)) return getAddress(raw);
  }

  for (const method of ["eth_accounts", "eth_requestAccounts"] as const) {
    try {
      const accounts = (await provider.request({ method })) as string[];
      if (Array.isArray(accounts)) {
        for (const raw of accounts) {
          if (raw && isAddress(raw)) return getAddress(raw);
        }
      }
    } catch {
      /* try next */
    }
  }

  throw new Error(
    "No account after WalletConnect pairing. Approve the session in your wallet, then try again."
  );
}

function clearStaleWalletConnectStorage() {
  try {
    window.localStorage.removeItem("otv-wc-session");
    for (const key of Object.keys(window.localStorage)) {
      if (
        key.startsWith("wc@2:") ||
        key.startsWith("WALLETCONNECT") ||
        key.toLowerCase().includes("walletconnect")
      ) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    /* best-effort */
  }
}

type Props = {
  onLinked: (address: string | null) => void;
  onUseAsTarget: (address: string) => void;
};

export default function LinkWallet({ onLinked, onUseAsTarget }: Props) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [wallet, setWallet] = useState<LinkedWallet | null>(null);
  const [busy, setBusy] = useState<"injected" | "walletconnect" | "sectool" | null>(null);
  const [pairingQr, setPairingQr] = useState<string | null>(null);
  const [pairingUri, setPairingUri] = useState<string | null>(null);
  const [pairingCopied, setPairingCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingReady, setSigningReady] = useState(false);
  const onLinkedRef = useRef(onLinked);
  const onUseAsTargetRef = useRef(onUseAsTarget);
  onLinkedRef.current = onLinked;
  onUseAsTargetRef.current = onUseAsTarget;
  const restoredRef = useRef(false);

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
    onLinkedRef.current(wallet?.address ?? null);
  }, [wallet]);

  async function persistLinkedWallet(
    address: string,
    source: LinkedWallet["source"]
  ): Promise<void> {
    const res = await fetch(withBasePath("/api/admin/wallets"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, source }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? "Failed to link wallet.");
    }
    window.dispatchEvent(new Event("otv-admin-settings-updated"));
  }

  async function applyAddress(
    raw: string,
    source: LinkedWallet["source"],
    provider: Eip1193Provider | null = null,
    opts: { setTarget?: boolean } = { setTarget: true }
  ) {
    if (!raw || !isAddress(raw)) {
      throw new Error("Invalid wallet address.");
    }
    const address = getAddress(raw);
    await persistLinkedWallet(address, source);
    setActiveWalletProvider(provider, provider ? address : null);
    setWallet({ address, source });
    setSigningReady(Boolean(provider));
    setError(null);
    if (opts.setTarget !== false) {
      onUseAsTargetRef.current(address);
    }
  }

  function clearWcPersist() {
    try {
      window.localStorage.removeItem("otv-wc-session");
    } catch {
      /* non-fatal */
    }
  }

  function subscribeProviderEvents(provider: Eip1193Provider, source: LinkedWallet["source"]) {
    try {
      const anyProvider = provider as WcProviderLike;
      if (!anyProvider?.on) return;
      anyProvider.on("accountsChanged", (...args: unknown[]) => {
        const accs = args[0] as string[] | undefined;
        if (accs && accs.length > 0 && isAddress(accs[0])) {
          const addr = getAddress(accs[0]);
          setActiveWalletProvider(provider, addr);
          setWallet({ address: addr, source });
          setSigningReady(true);
          setError(null);
          onUseAsTargetRef.current(addr);
          void persistLinkedWallet(addr, source).catch(() => undefined);
        } else {
          setActiveWalletProvider(null, null);
          setSigningReady(false);
        }
      });
      anyProvider.on("disconnect", () => {
        setActiveWalletProvider(null, null);
        setSigningReady(false);
        clearWcPersist();
      });
    } catch {
      /* non-fatal */
    }
  }

  async function connectInjected() {
    setError(null);
    setBusy("injected");
    try {
      const provider = getInjectedProvider();
      if (!provider) {
        setError("No browser wallet.");
        return;
      }
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) {
        throw new Error("No accounts.");
      }
      await applyAddress(accounts[0], "injected", provider);
      subscribeProviderEvents(provider, "injected");
    } catch (err) {
      setError(walletErrorMessage(err, "Connect failed."));
    } finally {
      setBusy(null);
    }
  }

  async function connectSectoolWallet() {
    setError(null);
    setBusy("sectool");
    try {
      let clientId = config?.sectool?.clientId ?? "";
      let network = config?.sectool?.network ?? "sapphire_mainnet";
      try {
        const res = await fetch(withBasePath("/api/config/public"));
        if (res.ok) {
          const fresh = (await res.json()) as PublicConfig;
          setConfig(fresh);
          clientId = fresh.sectool?.clientId || clientId;
          network = fresh.sectool?.network || network;
        }
      } catch {
        /* keep prior */
      }
      const { connectSectool } = await import("../lib/sectool");
      const linked = await connectSectool({ clientId, network });
      await applyAddress(linked.address, "sectool", linked.provider);
      subscribeProviderEvents(linked.provider, "sectool");
    } catch (err) {
      const msg = walletErrorMessage(err, "sectool connect failed.");
      if (!/closed the modal|user closed|User closed/i.test(msg)) {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  async function trySilentInjected() {
    const provider = getInjectedProvider();
    if (!provider) return false;
    try {
      const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
      if (!accounts?.length || !isAddress(accounts[0])) return false;
      await applyAddress(accounts[0], "injected", provider);
      subscribeProviderEvents(provider, "injected");
      return true;
    } catch {
      return false;
    }
  }

  type WcPersist = { topic: string; address: string; projectId: string; chainId: number };

  /** Silent restore: reuse a live WalletConnect session without a QR scan when possible. */
  async function trySilentWalletConnect(): Promise<boolean> {
    let saved: WcPersist | null = null;
    try {
      const raw = window.localStorage.getItem("otv-wc-session");
      if (!raw) return false;
      const data = JSON.parse(raw) as Partial<WcPersist>;
      if (typeof data.topic !== "string" || !data.topic || !isAddress(data.address ?? "")) {
        return false;
      }
      saved = {
        topic: data.topic,
        address: getAddress(data.address ?? ""),
        projectId: typeof data.projectId === "string" ? data.projectId : "",
        chainId: typeof data.chainId === "number" ? data.chainId : 8453,
      };
    } catch {
      return false;
    }
    try {
      let projectId = saved.projectId || config?.walletConnectProjectId || "";
      if (!projectId) {
        const res = await fetch(withBasePath("/api/config/public"));
        if (res.ok) {
          const fresh = (await res.json()) as PublicConfig;
          setConfig(fresh);
          projectId = fresh.walletConnectProjectId || "";
        }
      }
      if (!projectId) return false;

      const provider = await initWalletConnectProvider(projectId, saved.chainId || 8453, false);

      // Prefer an already-restored session from WC storage before forcing a pairing reconnect.
      let account: string | null = null;
      try {
        account = await resolveWcAccount(provider);
      } catch {
        if (typeof provider.connect === "function") {
          await provider.connect({ pairingTopic: saved.topic });
          account = await resolveWcAccount(provider);
        }
      }
      if (!account) return false;

      try {
        const res = await fetch(withBasePath("/api/admin/wallets"), { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const linked = Array.isArray(data.wallets)
            ? data.wallets.some(
                (w: { address?: string }) =>
                  typeof w?.address === "string" && w.address.toLowerCase() === account!.toLowerCase()
              )
            : false;
          if (!linked) {
            clearWcPersist();
            return false;
          }
        }
      } catch {
        /* allow restore when the list cannot be read */
      }
      await applyAddress(account, "walletconnect", provider);
      subscribeProviderEvents(provider, "walletconnect");
      return true;
    } catch {
      clearWcPersist();
      return false;
    }
  }

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    let cancelled = false;
    void (async () => {
      const silent = await trySilentInjected();
      const silentWc = silent ? true : await trySilentWalletConnect();
      if (cancelled || silentWc) return;
      try {
        const res = await fetch(withBasePath("/api/admin/wallets"), { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const first = Array.isArray(data.wallets) ? data.wallets[0] : null;
        if (first?.address && isAddress(first.address)) {
          const source =
            first.source === "walletconnect" || first.source === "sectool"
              ? (first.source as LinkedWallet["source"])
              : "injected";
          setWallet({
            address: getAddress(first.address),
            source,
          });
          setSigningReady(false);
          onUseAsTargetRef.current(getAddress(first.address));
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectWalletConnect() {
    setError(null);
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
      /* keep prior */
    }

    if (!projectId) {
      setError("WalletConnect not configured.");
      return;
    }
    setBusy("walletconnect");
    setPairingQr(null);
    setPairingUri(null);
    setPairingCopied(false);
    try {
      clearStaleWalletConnectStorage();

      const QRCode = (await import("qrcode")).default;
      const provider = await initWalletConnectProvider(projectId, chainId, false);
      const onDisplay = (uri: string) => {
        if (!uri?.startsWith("wc:")) return;
        setPairingUri(uri);
        void QRCode.toDataURL(uri, {
          margin: 2,
          width: 280,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#FFFFFF" },
        })
          .then((img) => setPairingQr(img))
          .catch(() => undefined);
      };
      provider.on?.("display_uri", onDisplay);
      try {
        await provider.connect?.();
      } finally {
        provider.off?.("display_uri", onDisplay);
      }

      const account = await resolveWcAccount(provider);
      await applyAddress(account, "walletconnect", provider);
      subscribeProviderEvents(provider, "walletconnect");
      try {
        // Persist session topic (preferred) or pairing topic for silent restore.
        const topic = provider.session?.topic || provider.session?.pairingTopic;
        if (topic && isAddress(account)) {
          window.localStorage.setItem(
            "otv-wc-session",
            JSON.stringify({ topic, address: getAddress(account), projectId, chainId })
          );
        }
      } catch {
        /* persistence is best-effort */
      }
      setPairingQr(null);
      setPairingUri(null);
    } catch (err) {
      setPairingQr(null);
      setPairingUri(null);
      setError(walletErrorMessage(err, "WalletConnect failed."));
    } finally {
      setBusy(null);
    }
  }

  function disconnect() {
    setActiveWalletProvider(null, null);
    setWallet(null);
    setSigningReady(false);
    setError(null);
    clearWcPersist();
  }

  async function unlinkFromDashboard() {
    if (!wallet?.address) return;
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/admin/wallets"), {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet.address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Unlink failed.");
      }
      window.dispatchEvent(new Event("otv-admin-settings-updated"));
      setActiveWalletProvider(null, null);
      setWallet(null);
      setSigningReady(false);
    } catch (err) {
      setError(walletErrorMessage(err, "Unlink failed."));
    }
  }

  const wcReady = Boolean(config?.walletConnectConfigured);
  const sectoolReady = Boolean(config?.sectool?.configured ?? true);
  const sourceLabel =
    wallet?.source === "walletconnect"
      ? "WalletConnect"
      : wallet?.source === "sectool"
        ? "sectool"
        : "Injected";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-[#6B7280]">Wallet</p>
          {wallet ? (
            <p className="mt-1 break-all font-mono text-sm text-[#101828] sm:break-normal">
              {shortAddress(wallet.address)}
              <span className="ml-2 text-xs text-[#6B7280]">{sourceLabel}</span>
              {signingReady ? (
                <span className="ml-2 text-xs text-[#12805C]">signing</span>
              ) : (
                <span className="ml-2 text-xs text-[#B54708]">reconnect</span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#6B7280]">Not connected</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {(!wallet || !signingReady) && (
            <>
              <button
                type="button"
                title="MetaMask Embedded Wallets — sectool project (sapphire_mainnet)"
                onClick={() => void connectSectoolWallet()}
                disabled={busy !== null || !sectoolReady}
                className="min-h-[44px] w-full rounded-full bg-[#D7FF00] px-4 py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "sectool" ? "Opening sectool…" : "MetaMask · sectool"}
              </button>
              <button
                type="button"
                title="Browser-extension wallets (MetaMask, Trust Wallet extension, Rabby)"
                onClick={() => void connectInjected()}
                disabled={busy !== null}
                className="min-h-[44px] w-full rounded-full border border-[#CBD1DE] bg-transparent px-4 py-2 text-sm font-medium text-[#101828] transition hover:border-[#B8E600] hover:text-[#0B0F14] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "injected" ? "Connecting…" : "Connect Browser Wallet"}
              </button>
              <button
                type="button"
                title="Any wallet via WalletConnect pairing (mobile Trust Wallet, MetaMask Mobile, …)"
                onClick={() => void connectWalletConnect()}
                disabled={busy !== null || !wcReady}
                className="min-h-[44px] w-full rounded-full border border-[#CBD1DE] bg-transparent px-4 py-2 text-sm font-medium text-[#101828] transition hover:border-[#B8E600] hover:text-[#0B0F14] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "walletconnect" ? "Connecting…" : "WalletConnect · Any Wallet"}
              </button>
            </>
          )}
          {wallet && signingReady && (
            <>
              <button
                type="button"
                onClick={() => onUseAsTarget(wallet.address)}
                className="min-h-[44px] w-full rounded-full bg-[#D7FF00] px-4 py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] sm:w-auto"
              >
                Use as target
              </button>
              <button
                type="button"
                onClick={disconnect}
                className="min-h-[44px] w-full rounded-full border border-[#CBD1DE] px-4 py-2 text-sm text-[#6B7280] transition hover:border-[#B8E600] hover:text-[#0B0F14] sm:w-auto"
              >
                Disconnect
              </button>
              <button
                type="button"
                onClick={() => void unlinkFromDashboard()}
                className="min-h-[44px] w-full rounded-full border border-[#CBD1DE] px-4 py-2 text-sm text-[#6B7280] transition hover:border-[#B8E600] hover:text-[#0B0F14] sm:w-auto"
              >
                Unlink
              </button>
            </>
          )}
        </div>
      </div>

      {busy === "walletconnect" && (
        <div className="mx-auto w-full max-w-[320px] space-y-2 rounded-2xl border border-[#DDE1EA] bg-[#FFFFFF] p-4">
          {pairingQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pairingQr}
              alt="WalletConnect QR"
              width={280}
              height={280}
              className="mx-auto h-auto w-full max-w-[280px] bg-white"
            />
          ) : (
            <p className="text-center text-xs text-[#6B7280]">Preparing QR…</p>
          )}
          <p className="text-center text-[11px] leading-relaxed text-[#6B7280]">
            Scan with MetaMask, Trust Wallet, or any WalletConnect wallet.
          </p>
          {pairingUri && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(pairingUri).catch(() => {});
                setPairingCopied(true);
                window.setTimeout(() => setPairingCopied(false), 2000);
              }}
              className="min-h-10 w-full rounded-full border border-[#CBD1DE] px-3 text-xs font-medium text-[#101828] transition hover:border-[#B8E600]"
            >
              {pairingCopied ? "Pairing link copied" : "Copy pairing link"}
            </button>
          )}
        </div>
      )}

      {error && <p className="break-words text-xs text-[#D92D20]">{error}</p>}
    </div>
  );
}
