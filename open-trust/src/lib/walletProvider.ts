/**
 * Browser-only holder for the active EIP-1193 provider (MetaMask or WalletConnect).
 * Used so trigger vectors can be signed by the admin's real linked wallet.
 *
 * NOTE: the provider lives in this tab's memory only. A full page reload
 * clears the signing session; the linked *address* is restored from Postgres
 * for allowlist display, but the wallet must reconnect to sign again.
 * Passkey-only links never have a provider (they identify the target only).
 */

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  providers?: Eip1193Provider[];
  isMetaMask?: boolean;
  accounts?: string[];
  on?: (...args: unknown[]) => void;
  off?: (...args: unknown[]) => void;
  disconnect?: () => Promise<void>;
};

let activeProvider: Eip1193Provider | null = null;
let activeAddress: string | null = null;
const signingListeners = new Set<() => void>();

function notifySigningChanged() {
  signingListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* non-fatal */
    }
  });
}

/** Subscribe to signing-session changes (connect / disconnect / account switch). */
export function subscribeSigningChange(fn: () => void): () => void {
  signingListeners.add(fn);
  return () => {
    signingListeners.delete(fn);
  };
}

export function setActiveWalletProvider(
  provider: Eip1193Provider | null,
  address: string | null = null
) {
  activeProvider = provider;
  activeAddress = address;
  notifySigningChanged();
}

export function getActiveWalletProvider(): Eip1193Provider | null {
  return activeProvider;
}

export function getActiveWalletAddress(): string | null {
  return activeAddress;
}

/** True only when this tab can actually sign (provider + address present). */
export function isWalletSigningReady(): boolean {
  return Boolean(activeProvider && activeAddress);
}

/** Prefer MetaMask when multiple injected providers exist. */
export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers.find((p) => p?.isMetaMask) || eth.providers[0] || eth;
  }
  return eth;
}
