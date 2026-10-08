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
      if (cancelled || silent) return;
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
      const imported = await import("@walletconnect/ethereum-provider");
      const EthereumProvider = imported.default;
      const QRCode = (await import("qrcode")).default;
      const provider = await EthereumProvider.init({
        projectId,
        optionalChains: [chainId, 8453, 1, 137],
        showQrModal: false,
        metadata: {
          name: "3GGA Admin",
          description: "3GGA",
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
        throw new Error("No account.");
      }
      await applyAddress(account, "walletconnect", provider as unknown as Eip1193Provider);
      subscribeProviderEvents(provider as unknown as Eip1193Provider, "walletconnect");
      setPairingQr(null);
    } catch (err) {
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
          <p className="text-xs text-[#6B7686]">Wallet</p>
          {wallet ? (
            <p className="mt-1 break-all font-mono text-sm text-[#ECEFF3] sm:break-normal">
              {shortAddress(wallet.address)}
              <span className="ml-2 text-xs text-[#6B7686]">{sourceLabel}</span>
              {signingReady ? (
                <span className="ml-2 text-xs text-[#7EE2A8]">signing</span>
              ) : (
                <span className="ml-2 text-xs text-[#FFB020]">reconnect</span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#6B7686]">Not connected</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {(!wallet || !signingReady) && (
            <>
              <button
                type="button"
                onClick={() => void connectInjected()}
                disabled={busy !== null}
                className="min-h-[44px] w-full rounded-full bg-[#E11D48] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "injected" ? "Connecting…" : "Connect MetaMask"}
              </button>
              <button
                type="button"
                onClick={() => void connectWalletConnect()}
                disabled={busy !== null || !wcReady}
                className="min-h-[44px] w-full rounded-full border border-[#20242C] bg-transparent px-4 py-2 text-sm font-medium text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "walletconnect" ? "Connecting…" : "WalletConnect"}
              </button>
              <button
                type="button"
                onClick={() => void linkWithPasskey()}
                disabled={busy !== null || !passkeyOk}
                className="min-h-[44px] w-full rounded-full border border-[#20242C] bg-transparent px-4 py-2 text-sm font-medium text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {busy === "passkey-register" ? "Linking…" : "Passkey"}
              </button>
              {passkeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => void assertPasskey()}
                  disabled={busy !== null || !passkeyOk}
                  className="min-h-[44px] w-full rounded-full border border-[#20242C] bg-transparent px-4 py-2 text-sm font-medium text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
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
                Unlink
              </button>
            </>
          )}
        </div>
      </div>

      {busy === "walletconnect" && (
        <div className="space-y-2 rounded-lg border border-[#1C2430] bg-[#0A0E14] p-3">
          {pairingQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pairingQr} alt="WalletConnect QR" width={280} height={280} />
          ) : (
            <p className="text-xs text-[#6B7686]">Preparing QR…</p>
          )}
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
            className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-[#20242C] bg-[#0A0E14] px-3 font-mono text-sm text-[#ECEFF3] outline-none placeholder:text-[#3A4450] focus:border-[#E11D48]"
          />
          <button
            type="button"
            onClick={() => void saveAssociatedAddress(pendingPasskeyId)}
            disabled={busy !== null || !associateDraft.trim()}
            className="min-h-[44px] w-full shrink-0 rounded-full bg-[#E11D48] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
          >
            {busy === "passkey-save" ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {passkeys.length > 0 && (
        <ul className="space-y-2 border-t border-[#171B22] pt-3">
          {passkeys.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="break-all font-mono text-xs text-[#ECEFF3]">
                {shortCredentialId(p.credentialId)}
                {p.linkedAddress ? (
                  <span className="ml-2 text-[#8A95A5]">→ {shortAddress(p.linkedAddress)}</span>
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
                    className="min-h-[40px] w-full rounded-full border border-[#20242C] px-3 py-1.5 text-xs text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] sm:w-auto"
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
                    className="min-h-[40px] w-full rounded-full border border-[#20242C] px-3 py-1.5 text-xs text-[#ECEFF3] transition hover:border-[#E11D48] hover:text-[#E11D48] sm:w-auto"
                  >
                    Target
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
      )}

      {error && <p className="break-words text-xs text-[#FF5C6C]">{error}</p>}
    </div>
  );
}
