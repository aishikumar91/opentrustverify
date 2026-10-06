"use client";

import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { withBasePath } from "../lib/basePath";

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

function shortCredentialId(id: string) {
  if (id.length < 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
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
  const [error, setError] = useState<string | null>(null);
  const [hasInjected, setHasInjected] = useState(false);
  const [passkeyOk, setPasskeyOk] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyPublic[]>([]);
  const [associateDraft, setAssociateDraft] = useState("");
  const [pendingPasskeyId, setPendingPasskeyId] = useState<number | null>(null);
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
            ? "No browser wallet detected. Install MetaMask/Rabby, use WalletConnect, or Link with Passkey."
            : "No browser wallet detected, and WalletConnect is not configured. Install MetaMask/Rabby, or use Link with Passkey."
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
        applyAddress(passkey.linkedAddress, "passkey");
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
        applyAddress(linked, "passkey");
        setPendingPasskeyId(null);
      } else {
        const pk = verifyData.passkey as PasskeyPublic;
        setPendingPasskeyId(pk.id);
        setError(
          "Passkey verified, but no EVM address is associated yet. Paste an allowlisted address below."
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
        applyAddress(passkey.linkedAddress, "passkey");
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
          applyAddress(still.linkedAddress, "passkey");
        } else {
          setWallet(null);
        }
      }
      await refreshPasskeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink passkey");
    }
  }

  function disconnect() {
    setWallet(null);
    setError(null);
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
            </>
          )}
        </div>
      </div>

      {pendingPasskeyId !== null && (
        <div className="space-y-2 rounded-lg border border-[#1C2430] bg-[#0A0E14] p-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#B9C4CE]">
            Associate EVM address
          </p>
          <p className="break-words text-xs leading-relaxed text-[#5A6575]">
            Passkeys store a credential id and public key only — not a private key. Paste an
            allowlisted address to use as the trigger target after passkey unlock.
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
                        applyAddress(p.linkedAddress!, "passkey");
                        onUseAsTarget(getAddress(p.linkedAddress!));
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
          wallets and Passkeys still work when available in this browser.
        </p>
      )}
      {!passkeyOk && (
        <p className="break-words text-xs leading-relaxed text-[#6B7686]">
          Passkeys unavailable in this browser — use MetaMask, WalletConnect, or a device with
          a platform authenticator.
        </p>
      )}
      {error && <p className="break-words text-xs text-[#FF5C6C]">{error}</p>}
    </div>
  );
}
