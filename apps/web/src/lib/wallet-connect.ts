import type EthereumProvider from "@walletconnect/ethereum-provider";
import { isWalletConnectUri, pairingQrDataUrl } from "./wallet-connect-uri";

const CHAINS = [1, 8453, 137] as const;

export type WalletConnectAccount = {
  address: string;
  name: string;
  origin: string;
};

export class WalletConnectPairingError extends Error {
  constructor(
    readonly code: "missing_project" | "cancelled" | "rejected" | "no_account" | "failed",
    message: string,
  ) {
    super(message);
    this.name = "WalletConnectPairingError";
  }
}

let provider: EthereumProvider | null = null;
let generation = 0;

export function walletConnectProjectId(): string | null {
  const raw = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  const id = typeof raw === "string" ? raw.trim() : "";
  return id.length > 0 ? id : null;
}

function readAccount(current: EthereumProvider): WalletConnectAccount | null {
  const address = current.accounts[0];
  if (!address) return null;
  return {
    address,
    name: current.session?.peer?.metadata?.name ?? "WalletConnect",
    origin: current.session?.peer?.metadata?.url ?? "walletconnect",
  };
}

async function createProvider(): Promise<EthereumProvider> {
  const projectId = walletConnectProjectId();
  if (!projectId) {
    throw new WalletConnectPairingError(
      "missing_project",
      "WalletConnect is not configured on this deployment. Use an injected wallet or create a local wallet.",
    );
  }
  const { default: EthereumProviderCtor } = await import("@walletconnect/ethereum-provider");
  return EthereumProviderCtor.init({
    projectId,
    optionalChains: [...CHAINS],
    showQrModal: false,
    metadata: {
      name: "OpenTrust Wallet",
      description: "Self-custodial wallet for OpenTrust Verify",
      url: "https://otv.poptrust.me",
      icons: ["https://otv.poptrust.me/favicon.svg"],
    },
    rpcMap: {
      "1": "https://ethereum.publicnode.com",
      "8453": "https://base.publicnode.com",
      "137": "https://polygon-bor-rpc.publicnode.com",
    },
  });
}

export async function restoreWalletConnect(): Promise<WalletConnectAccount | null> {
  if (!walletConnectProjectId()) return null;
  if (provider?.accounts[0]) return readAccount(provider);
  const ticket = generation;
  const current = await createProvider();
  if (ticket !== generation) {
    await current.disconnect().catch(() => undefined);
    return null;
  }
  provider = current;
  return readAccount(current);
}

export async function startWalletConnectPairing(onQr: (image: string) => void): Promise<WalletConnectAccount> {
  const ticket = ++generation;
  const previous = provider;
  provider = null;
  if (previous) await previous.disconnect().catch(() => undefined);
  if (ticket !== generation) throw new WalletConnectPairingError("cancelled", "cancelled");

  const current = await createProvider();
  if (ticket !== generation) {
    await current.disconnect().catch(() => undefined);
    throw new WalletConnectPairingError("cancelled", "cancelled");
  }
  provider = current;

  const onDisplay = (uri: string) => {
    if (ticket !== generation || !isWalletConnectUri(uri)) return;
    void pairingQrDataUrl(uri)
      .then((image) => {
        if (ticket === generation) onQr(image);
      })
      .catch(() => undefined);
  };
  current.on("display_uri", onDisplay);
  try {
    await current.connect();
    if (ticket !== generation) throw new WalletConnectPairingError("cancelled", "cancelled");
    const account = readAccount(current);
    if (!account) {
      throw new WalletConnectPairingError("no_account", "WalletConnect did not return an account.");
    }
    return account;
  } catch (err) {
    if (err instanceof WalletConnectPairingError) throw err;
    if (ticket !== generation) throw new WalletConnectPairingError("cancelled", "cancelled");
    const message = err instanceof Error ? err.message : "";
    if (/reject|reset|denied|closed/i.test(message)) {
      throw new WalletConnectPairingError("rejected", "The wallet rejected the link. No session was stored.");
    }
    throw new WalletConnectPairingError("failed", "WalletConnect did not connect. No session was stored.");
  } finally {
    current.off("display_uri", onDisplay);
  }
}

export function cancelWalletConnectPairing(): void {
  generation += 1;
  const current = provider;
  provider = null;
  if (current) void current.disconnect().catch(() => undefined);
}

export async function disconnectWalletConnect(): Promise<void> {
  generation += 1;
  const current = provider;
  provider = null;
  if (current) await current.disconnect().catch(() => undefined);
}

export async function walletConnectRequest<T = unknown>(args: {
  method: string;
  params?: unknown[];
}): Promise<T> {
  if (!provider?.session) {
    throw new Error("The linked wallet is not available for signing.");
  }
  return provider.request<T>(args);
}

export function subscribeWalletConnect(listeners: {
  disconnect?: () => void;
  accountsChanged?: (accounts: string[]) => void;
}): () => void {
  const current = provider;
  if (!current) return () => undefined;
  const onDisconnect = () => listeners.disconnect?.();
  const onAccounts = (accounts: string[]) => listeners.accountsChanged?.(accounts);
  if (listeners.disconnect) current.on("disconnect", onDisconnect);
  if (listeners.accountsChanged) current.on("accountsChanged", onAccounts);
  return () => {
    if (listeners.disconnect) current.off("disconnect", onDisconnect);
    if (listeners.accountsChanged) current.off("accountsChanged", onAccounts);
  };
}
