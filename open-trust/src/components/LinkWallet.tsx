"use client";

import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { withBasePath } from "../lib/basePath";
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
  const [hasInjected, setHasInjected] = useState(false);
  const [passkeyOk, setPasskeyOk] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyPublic[]>([]);
  const [associateDraft, setAssociateDraft] = useState("");
  const [pendingPasskeyId, setPendingPasskeyId] = useState<number | null>(null);
  const [signingReady, setSigningReady] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
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
      // Non-fatal on first paint (session or table may still be warming).
    }
  }

  useEffect(() => {
    void refreshPasskeys();
  }, []);

  // Restore last linked dashboard wallet (address only — must reconnect to sign).
  useEffect(() => {
    let cancelled = false;
    void fetch(withBasePath("/api/admin/wallets"), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const first = Array.isArray(data.wallets) ? data.wallets[0] : null;
        if (!cancelled && first?.address && isAddress(first.address) && !wallet) {
          setWallet({
            address: getAddress(first.address),
            source: (first.source as LinkedWallet["source"]) || "injected",
          });
          // Address restored for allowlist display only — provider is gone after reload.
          setSigningReady(false);
          setNeedsReconnect(true);
        }
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount — do not re-run when wallet changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      throw new Error(
        (data as { error?: string }).error ?? "Failed to save linked wallet to dashboard"
      );
    }
    window.dispatchEvent(new Event("otv-admin-settings-updated"));
  }

  async function applyAddress(
    raw: string,
    source: LinkedWallet["source"],
    provider: Eip1193Provider | null = null
  ) {
    if (!raw || !isAddress(raw)) {
      throw new Error("Wallet did not return a valid EVM address.");
    }
    const address = getAddress(raw);
    await persistLinkedWallet(address, source);
    // Passkey-only links have no signing provider; MetaMask/WC do.
    // NOTE: provider lives only in this tab's memory — reload clears signing
    // while the linked address is restored from Postgres (needs reconnect).
    setActiveWalletProvider(provider, provider ? address : null);
    setWallet({ address, source });
    setSigningReady(Boolean(provider));
    setNeedsReconnect(false);
    setError(null);
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
          setNeedsReconnect(false);
          setError(null);
        } else {
          setActiveWalletProvider(null, null);
          setSigningReady(false);
          setNeedsReconnect(true);
        }
      });
      anyProvider.on("disconnect", () => {
        setActiveWalletProvider(null, null);
        setSigningReady(false);
        setNeedsReconnect(true);
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
        const wcReady = Boolean(config?.walletConnectConfigured);
        setError(
          wcReady
            ? "No browser wallet detected. Install MetaMask or Trust Wallet (extension), use WalletConnect for mobile Trust Wallet, or Link with Passkey."
            : "No browser wallet detected, and WalletConnect is not configured. Install MetaMask, or set a WalletConnect project ID for Trust Wallet."
        );
        return;
      }
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) {
        throw new Error("No accounts returned. Unlock MetaMask / Trust Wallet and try again.");
      }
      await applyAddress(accounts[0], "injected", provider);
      subscribeProviderEvents(provider, "injected");
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
    setPairingQr(null);
    try {
      const imported = await import("@walletconnect/ethereum-provider");
      const EthereumProvider = imported.default;
      const QRCode = (await import("qrcode")).default;
      const provider = await EthereumProvider.init({
        projectId,
        optionalChains: [chainId, 8453, 1, 137],
        showQrModal: false,
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
      const onDisplay = (uri: string) => {
        if (!uri?.startsWith("wc:")) return;
        void QRCode.toDataURL(uri, {
          margin: 1,
          width: 280,
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
        throw new Error("WalletConnect session opened but no account was returned.");
      }
      // WalletConnect provider is EIP-1193 — keep it for real signing (Trust Wallet).
      await applyAddress(account, "walletconnect", provider as unknown as Eip1193Provider);
      subscribeProviderEvents(provider as unknown as Eip1193Provider, "walletconnect");
      setPairingQr(null);
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

  async function linkWithPasskey() {
    setError(null);
    if (!webAuthnAvailable()) {
      setError(
        "Passkeys are not available in this browser. Use a platform authenticator (iOS/Android/desktop), or connect MetaMask / WalletConnect."
      );
      return;
    }
    setBusy("passkey-register");
    try {
      const { startRegistration, browserSupportsWebAuthn } = await import(
        "@simplewebauthn/browser"
      );
      if (!browserSupportsWebAuthn()) {
        setError("WebAuthn is not supported in this browser.");
        return;
      }

      const optRes = await fetch(withBasePath("/api/admin/passkeys/register/options"), {
        method: "POST",
        credentials: "include",
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error ?? "Failed to start passkey registration");

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
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "Passkey registration failed");

      const passkey = verifyData.passkey as PasskeyPublic;
      await refreshPasskeys();

      if (passkey.linkedAddress) {
        await applyAddress(passkey.linkedAddress, "passkey", null);
        setPendingPasskeyId(null);
        setAssociateDraft("");
      } else {
        setPendingPasskeyId(passkey.id);
        setAssociateDraft("");
        setError(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Passkey registration failed.";
      if (/not allowed|abort|cancel/i.test(msg)) {
        setError("Passkey registration cancelled.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  async function assertPasskey() {
    setError(null);
    if (!webAuthnAvailable()) {
      setError("Passkeys are not available in this browser.");
      return;
    }
    if (passkeys.length === 0) {
      setError("No passkeys linked yet. Use “Link with Passkey” first.");
      return;
    }
    setBusy("passkey-assert");
    try {
      const { startAuthentication, browserSupportsWebAuthn } = await import(
        "@simplewebauthn/browser"
      );
      if (!browserSupportsWebAuthn()) {
        setError("WebAuthn is not supported in this browser.");
        return;
      }

      const optRes = await fetch(withBasePath("/api/admin/passkeys/assert/options"), {
        method: "POST",
        credentials: "include",
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error ?? "Failed to start passkey assertion");

      const assertion = await startAuthentication({ optionsJSON: optData.options });

      const verifyRes = await fetch(withBasePath("/api/admin/passkeys/assert/verify"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "Passkey assertion failed");

      await refreshPasskeys();
      const linked = verifyData.linkedAddress as string | null;
      if (linked && isAddress(linked)) {
        await applyAddress(linked, "passkey", null);
        setPendingPasskeyId(null);
      } else {
        const pk = verifyData.passkey as PasskeyPublic;
        setPendingPasskeyId(pk.id);
        setError(
          "Passkey verified, but no EVM address is associated yet. Paste a wallet address below (or connect MetaMask / WalletConnect to sign)."
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Passkey assertion failed.";
      if (/not allowed|abort|cancel/i.test(msg)) {
        setError("Passkey cancelled.");
      } else {
        setError(msg);
      }
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
      if (!res.ok) throw new Error(data.error ?? "Failed to associate address");
      const passkey = data.passkey as PasskeyPublic;
      await refreshPasskeys();
      if (passkey.linkedAddress) {
        await applyAddress(passkey.linkedAddress, "passkey", null);
        setPendingPasskeyId(null);
        setAssociateDraft("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to associate address");
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
      if (!res.ok) throw new Error(data.error ?? "Failed to unlink passkey");
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
      setError(err instanceof Error ? err.message : "Failed to unlink passkey");
    }
  }

  function disconnect() {
    // Clears the active signing session only. Linked address stays on the
    // allowlist in Postgres until explicitly removed.
    setActiveWalletProvider(null, null);
    setWallet(null);
    setSigningReady(false);
    setNeedsReconnect(false);
    setError(null);
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
        throw new Error((data as { error?: string }).error ?? "Failed to unlink wallet");
      }
      window.dispatchEvent(new Event("otv-admin-settings-updated"));
      setActiveWalletProvider(null, null);
      setWallet(null);
      setSigningReady(false);
      setNeedsReconnect(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink wallet");
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
          <p className="text-xs text-[#6B7686]">Linked wallet</p>
          {wallet ? (
            <p className="mt-1 break-all font-mono text-sm text-[#ECEFF3] sm:break-normal">
              {shortAddress(wallet.address)}
              <span className="ml-2 text-xs text-[#6B7686]">{sourceLabel}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#6B7686]">No wallet linked</p>
          )}
          {wallet && !signingReady && (
            <p className="mt-1 break-words text-xs text-[#FFB020]">
              {needsReconnect
                ? "Linked for allowlist, but signing needs reconnect (reload clears the signing session)."
                : "Passkey links identify the target only and cannot sign — connect MetaMask / WalletConnect to sign."}
            </p>
          )}
          {wallet && signingReady && (
            <p className="mt-1 text-xs text-[#7EE2A8]">Signing ready — this wallet will sign tx + gas.</p>
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
                {busy === "walletconnect" ? "Connecting…" : "Trust Wallet / WC"}
              </button>
              <button
                type="button"
                onClick={() => void linkWithPasskey()}
                disabled={busy !== null || !passkeyOk}
                title={
                  passkeyOk
                    ? "Create a platform passkey and optionally associate an allowlisted address"
                    : "WebAuthn / passkeys are not available in this browser"
                }
                className="min-h-[44px] w-full rounded-full border border-[#20242C] bg-transparent px-4 py-2 text-sm font-medium text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "passkey-register" ? "Linking…" : "Link with Passkey"}
              </button>
              {passkeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => void assertPasskey()}
                  disabled={busy !== null || !passkeyOk}
                  title="Unlock a previously linked passkey and use its associated address"
                  className="min-h-[44px] w-full rounded-full border border-[#20242C] bg-transparent px-4 py-2 text-sm font-medium text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
                >
                  {busy === "passkey-assert" ? "Verifying…" : "Use Passkey"}
                </button>
              )}
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
              <button
                type="button"
                onClick={() => void unlinkFromDashboard()}
                className="min-h-[44px] w-full rounded-full border border-[#20242C] px-4 py-2 text-sm text-[#6B7686] transition hover:border-[#E11D48] hover:text-[#E11D48] sm:w-auto"
              >
                Unlink from dashboard
              </button>
            </>
          )}
        </div>
      </div>

      {busy === "walletconnect" && (
        <div className="space-y-2 rounded-lg border border-[#1C2430] bg-[#0A0E14] p-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#B9C4CE]">
            WalletConnect QR
          </p>
          <p className="text-xs leading-relaxed text-[#5A6575]">
            Scan with Trust Wallet / MetaMask mobile. This is a pairing link — not a receive address.
          </p>
          {pairingQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pairingQr} alt="WalletConnect pairing QR" width={280} height={280} />
          ) : (
            <p className="text-xs text-[#6B7686]">Preparing pairing code…</p>
          )}
        </div>
      )}

      {pendingPasskeyId !== null && (
        <div className="space-y-2 rounded-lg border border-[#1C2430] bg-[#0A0E14] p-3">
          <p className="font-caption text-xs uppercase tracking-[0.12em] text-[#B9C4CE]">
            Associate address
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              type="text"
              value={associateDraft}
              onChange={(e) => setAssociateDraft(e.target.value)}
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
              className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-[#20242C] bg-[#0A0E14] px-3 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4450] focus:border-[#E11D48]"
            />
            <button
              type="button"
              onClick={() => void saveAssociatedAddress(pendingPasskeyId)}
              disabled={busy !== null || !associateDraft.trim()}
              className="min-h-[44px] w-full shrink-0 rounded-full bg-[#E11D48] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
            >
              {busy === "passkey-save" ? "Saving…" : "Save address"}
            </button>
          </div>
        </div>
      )}

      {passkeys.length > 0 && (
        <div className="space-y-2 border-t border-[#171B22] pt-3">
          <p className="text-xs text-[#6B7686]">Linked passkeys</p>
          <ul className="space-y-2">
            {passkeys.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-all font-mono text-xs text-[#ECEFF3]">
                    {shortCredentialId(p.credentialId)}
                    {p.linkedAddress ? (
                      <span className="ml-2 text-[#8A95A5]">
                        → {shortAddress(p.linkedAddress)}
                      </span>
                    ) : (
                      <span className="ml-2 text-[#5A6575]">no address</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {!p.linkedAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingPasskeyId(p.id);
                        setAssociateDraft("");
                      }}
                      className="min-h-[40px] w-full rounded-full border border-[#20242C] px-3 py-1.5 text-xs text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] sm:w-auto"
                    >
                      Associate address
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
                      className="min-h-[40px] w-full rounded-full border border-[#20242C] px-3 py-1.5 text-xs text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] sm:w-auto"
                    >
                      Use as target
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void unlinkPasskey(p.id)}
                    className="min-h-[40px] w-full rounded-full border border-[#20242C] px-3 py-1.5 text-xs text-[#6B7686] transition hover:border-[#E11D48] hover:text-[#E11D48] sm:w-auto"
                  >
                    Unlink
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="break-words text-xs text-[#FF5C6C]">{error}</p>}
    </div>
  );
}
