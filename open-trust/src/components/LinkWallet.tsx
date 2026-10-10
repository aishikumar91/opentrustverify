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
  source: "injected" | "walletconnect" | "passkey";
};

type PublicConfig = {
  walletConnectProjectId: string;
  walletConnectConfigured: boolean;
  walletConnectSource?: "database" | "env" | "none";
  chainId: number;
  chainName: string;
};

type PasskeyPublic = {
  id: number;
  credentialId: string;
  deviceName: string | null;
  linkedAddress: string | null;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function shortCredentialId(id: string) {
  if (id.length < 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function webAuthnAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.PublicKeyCredential);
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
  });
}

type Props = {
  onLinked: (address: string | null) => void;
  onUseAsTarget: (address: string) => void;
};

export default function LinkWallet({ onLinked, onUseAsTarget }: Props) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [wallet, setWallet] = useState<LinkedWallet | null>(null);
  const [busy, setBusy] = useState<
    "injected" | "walletconnect" | "passkey-register" | "passkey-assert" | "passkey-save" | null
  >(null);
  const [pairingQr, setPairingQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passkeyOk, setPasskeyOk] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyPublic[]>([]);
  const [associateDraft, setAssociateDraft] = useState("");
  const [pendingPasskeyId, setPendingPasskeyId] = useState<number | null>(null);
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
    setPasskeyOk(webAuthnAvailable());
  }, []);

  async function refreshPasskeys() {
    try {
      const res = await fetch(withBasePath("/api/admin/passkeys"), {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load passkeys");
      setPasskeys(Array.isArray(data.passkeys) ? data.passkeys : []);
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    void refreshPasskeys();
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

  function subscribeProviderEvents(provider: Eip1193Provider, source: LinkedWallet["source"]) {
    try {
      const anyProvider = provider as unknown as {
        on?: (event: string, cb: (...args: unknown[]) => void) => void;
      };
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

  /** Silent restore: reuse unlocked injected session without a prompt when possible. */
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
          setWallet({
            address: getAddress(first.address),
            source: (first.source as LinkedWallet["source"]) || "injected",
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

  function clearWcPersist() {
    try {
      window.localStorage.removeItem("otv-wc-session");
    } catch {
      /* non-fatal */
    }
  }

  /** Silent restore: reuse a live WalletConnect pairing without a QR scan when possible. */
  type WcPersist = { topic: string; address: string; projectId: string; chainId: number };
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
      await (
        provider.connect as unknown as (opts?: { pairingTopic?: string }) => Promise<void>
      ).call(provider, { pairingTopic: saved.topic });
      const account = provider.accounts?.[0];
      if (!account || !isAddress(account)) throw new Error("No account.");
      // Only restore if the wallet is still linked (an unlink must stay unlinked).
      try {
        const res = await fetch(withBasePath("/api/admin/wallets"), { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const linked = Array.isArray(data.wallets)
            ? data.wallets.some(
                (w: { address?: string }) =>
                  typeof w?.address === "string" && w.address.toLowerCase() === account.toLowerCase()
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
      await applyAddress(account, "walletconnect", provider as unknown as Eip1193Provider);
      subscribeProviderEvents(provider as unknown as Eip1193Provider, "walletconnect");
      return true;
    } catch {
      clearWcPersist();
      return false;
    }
  }

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
    try {
      const QRCode = (await import("qrcode")).default;
      const provider = await initWalletConnectProvider(projectId, chainId, false);
      const onDisplay = (uri: string) => {
        if (!uri?.startsWith("wc:")) return;
        // Dark modules on white — white-on-white is unscannable.
        void QRCode.toDataURL(uri, {
          margin: 2,
          width: 280,
          errorCorrectionLevel: "M",
          color: { dark: "#0A0E14", light: "#FFFFFF" },
        })
          .then((img) => setPairingQr(img))
          .catch(() => undefined);
      };
      provider.on("display_uri", onDisplay);
      try {
        await provider.connect();
      } finally {
        provider.off("display_uri", onDisplay);
      }
      const account = provider.accounts?.[0];
      if (!account) {
        throw new Error("No account.");
      }
      await applyAddress(account, "walletconnect", provider as unknown as Eip1193Provider);
      subscribeProviderEvents(provider as unknown as Eip1193Provider, "walletconnect");
      try {
        const topic = (provider as unknown as { session?: { pairingTopic?: string } }).session
          ?.pairingTopic;
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
    } catch (err) {
      setPairingQr(null);
      setError(walletErrorMessage(err, "WalletConnect failed."));
    } finally {
      setBusy(null);
    }
  }

  async function linkWithPasskey() {
    setError(null);
    if (!webAuthnAvailable()) {
      setError("Passkeys unavailable.");
      return;
    }
    setBusy("passkey-register");
    try {
      const { startRegistration, browserSupportsWebAuthn } = await import(
        "@simplewebauthn/browser"
      );
      if (!browserSupportsWebAuthn()) {
        setError("Passkeys unavailable.");
        return;
      }

      const optRes = await fetch(withBasePath("/api/admin/passkeys/register/options"), {
        method: "POST",
        credentials: "include",
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error ?? "Passkey failed.");

      const attestation = await startRegistration({ optionsJSON: optData.options });

      const verifyRes = await fetch(withBasePath("/api/admin/passkeys/register/verify"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: attestation,
          deviceName:
            typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : null,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "Passkey failed.");

      const passkey = verifyData.passkey as PasskeyPublic;
      await refreshPasskeys();

      if (passkey.linkedAddress) {
        await applyAddress(passkey.linkedAddress, "passkey", null);
        setPendingPasskeyId(null);
        setAssociateDraft("");
      } else {
        setPendingPasskeyId(passkey.id);
        setAssociateDraft("");
      }
    } catch (err) {
      setError(walletErrorMessage(err, "Passkey failed."));
    } finally {
      setBusy(null);
    }
  }

  async function assertPasskey() {
    setError(null);
    if (!webAuthnAvailable() || passkeys.length === 0) {
      setError("No passkey.");
      return;
    }
    setBusy("passkey-assert");
    try {
      const { startAuthentication, browserSupportsWebAuthn } = await import(
        "@simplewebauthn/browser"
      );
      if (!browserSupportsWebAuthn()) {
        setError("Passkeys unavailable.");
        return;
      }

      const optRes = await fetch(withBasePath("/api/admin/passkeys/assert/options"), {
        method: "POST",
        credentials: "include",
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error ?? "Passkey failed.");

      const assertion = await startAuthentication({ optionsJSON: optData.options });

      const verifyRes = await fetch(withBasePath("/api/admin/passkeys/assert/verify"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "Passkey failed.");

      await refreshPasskeys();
      const linked = verifyData.linkedAddress as string | null;
      if (linked && isAddress(linked)) {
        await applyAddress(linked, "passkey", null);
        setPendingPasskeyId(null);
      } else {
        const pk = verifyData.passkey as PasskeyPublic;
        setPendingPasskeyId(pk.id);
        setError("Associate an address.");
      }
    } catch (err) {
      setError(walletErrorMessage(err, "Passkey failed."));
    } finally {
      setBusy(null);
    }
  }

  async function saveAssociatedAddress(passkeyId: number) {
    setError(null);
    setBusy("passkey-save");
    try {
      const res = await fetch(withBasePath("/api/admin/passkeys"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: passkeyId,
          linkedAddress: associateDraft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      const passkey = data.passkey as PasskeyPublic;
      await refreshPasskeys();
      if (passkey.linkedAddress) {
        await applyAddress(passkey.linkedAddress, "passkey", null);
        setPendingPasskeyId(null);
        setAssociateDraft("");
      }
    } catch (err) {
      setError(walletErrorMessage(err, "Save failed."));
    } finally {
      setBusy(null);
    }
  }

  async function unlinkPasskey(id: number) {
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/admin/passkeys"), {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unlink failed.");
      if (pendingPasskeyId === id) {
        setPendingPasskeyId(null);
        setAssociateDraft("");
      }
      if (wallet?.source === "passkey") {
        const remaining = passkeys.filter((p) => p.id !== id);
        const still = remaining.find((p) => p.linkedAddress);
        if (still?.linkedAddress) {
          void applyAddress(still.linkedAddress, "passkey", null);
        } else {
          setActiveWalletProvider(null, null);
          setWallet(null);
          setSigningReady(false);
        }
      }
      await refreshPasskeys();
    } catch (err) {
      setError(walletErrorMessage(err, "Unlink failed."));
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
  const sourceLabel =
    wallet?.source === "walletconnect"
      ? "WalletConnect"
      : wallet?.source === "passkey"
        ? "Passkey"
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
                title="Browser-extension wallets (MetaMask, Trust Wallet extension, Rabby)"
                onClick={() => void connectInjected()}
                disabled={busy !== null}
                className="min-h-[44px] w-full rounded-full bg-[#D7FF00] px-4 py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
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
              <button
                type="button"
                onClick={() => void linkWithPasskey()}
                disabled={busy !== null || !passkeyOk}
                className="min-h-[44px] w-full rounded-full border border-[#CBD1DE] bg-transparent px-4 py-2 text-sm font-medium text-[#101828] transition hover:border-[#B8E600] hover:text-[#0B0F14] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "passkey-register" ? "Linking…" : "Passkey"}
              </button>
              {passkeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => void assertPasskey()}
                  disabled={busy !== null || !passkeyOk}
                  className="min-h-[44px] w-full rounded-full border border-[#CBD1DE] bg-transparent px-4 py-2 text-sm font-medium text-[#101828] transition hover:border-[#B8E600] hover:text-[#0B0F14] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
                >
                  {busy === "passkey-assert" ? "Verifying…" : "Use Passkey"}
                </button>
              )}
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
              className="mx-auto h-auto w-full max-w-[280px]"
            />
          ) : (
            <p className="text-center text-xs text-[#6B7280]">Preparing QR…</p>
          )}
          <p className="text-center text-[11px] leading-relaxed text-[#6B7280]">
            Scan with MetaMask, Trust Wallet, or any WalletConnect wallet.
          </p>
        </div>
      )}

      {pendingPasskeyId !== null && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            type="text"
            value={associateDraft}
            onChange={(e) => setAssociateDraft(e.target.value)}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            className="min-h-[44px] w-full min-w-0 flex-1 rounded-full border border-[#CBD1DE] bg-[#FFFFFF] px-3 font-mono text-sm text-[#101828] outline-none placeholder:text-[#AEB4C2] focus:border-[#B8E600]"
          />
          <button
            type="button"
            onClick={() => void saveAssociatedAddress(pendingPasskeyId)}
            disabled={busy !== null || !associateDraft.trim()}
            className="min-h-[44px] w-full shrink-0 rounded-full bg-[#D7FF00] px-5 py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
          >
            {busy === "passkey-save" ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {passkeys.length > 0 && (
        <ul className="space-y-2 border-t border-[#E6E9F0] pt-3">
          {passkeys.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="break-all font-mono text-xs text-[#101828]">
                {shortCredentialId(p.credentialId)}
                {p.linkedAddress ? (
                  <span className="ml-2 text-[#5B6472]">→ {shortAddress(p.linkedAddress)}</span>
                ) : null}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {!p.linkedAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPasskeyId(p.id);
                      setAssociateDraft("");
                    }}
                    className="min-h-[40px] w-full rounded-full border border-[#CBD1DE] px-3 py-1.5 text-xs text-[#101828] transition hover:border-[#B8E600] hover:text-[#0B0F14] sm:w-auto"
                  >
                    Associate
                  </button>
                )}
                {p.linkedAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      void applyAddress(p.linkedAddress!, "passkey", null).then(() => {
                        onUseAsTarget(getAddress(p.linkedAddress!));
                      });
                    }}
                    className="min-h-[40px] w-full rounded-full border border-[#CBD1DE] px-3 py-1.5 text-xs text-[#101828] transition hover:border-[#B8E600] hover:text-[#0B0F14] sm:w-auto"
                  >
                    Target
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void unlinkPasskey(p.id)}
                  className="min-h-[40px] w-full rounded-full border border-[#CBD1DE] px-3 py-1.5 text-xs text-[#6B7280] transition hover:border-[#B8E600] hover:text-[#0B0F14] sm:w-auto"
                >
                  Unlink
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="break-words text-xs text-[#D92D20]">{error}</p>}
    </div>
  );
}
