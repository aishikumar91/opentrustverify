/**
 * Browser-only holder for the active EIP-1193 provider (MetaMask or WalletConnect).
 * Used so trigger vectors can be signed by the admin's real linked wallet.
 */

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  providers?: Eip1193Provider[];
  isMetaMask?: boolean;
  disconnect?: () => Promise<void>;
};

let activeProvider: Eip1193Provider | null = null;
let activeAddress: string | null = null;

export function setActiveWalletProvider(
  provider: Eip1193Provider | null,
  address: string | null = null
) {
  activeProvider = provider;
  activeAddress = address;
}

export function getActiveWalletProvider(): Eip1193Provider | null {
  return activeProvider;
}

export function getActiveWalletAddress(): string | null {
  return activeAddress;
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
