import { Web3Auth, WEB3AUTH_NETWORK } from "@web3auth/modal";

const PROJECT_NAME = "sectool";
const DEFAULT_NETWORK = "sapphire_mainnet";
/** Public client id for the sectool project. Safe to ship in the browser bundle. */
const PUBLIC_CLIENT_ID = "BFQnBp6tI9LtWdhNGIkBum0O2pDUefxYnQboLBIxnWV1oaAEZOJknjf6zQK5OEdai8sv9BMZR78Bx-Gk1UBwO2M";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

let sdk: Web3Auth | null = null;

export function metamaskClientId(): string | null {
  const raw = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
  const id = typeof raw === "string" ? raw.trim() : "";
  return id || PUBLIC_CLIENT_ID;
}

export function metamaskNetwork(): "sapphire_mainnet" | "sapphire_devnet" {
  const raw = (import.meta.env.VITE_WEB3AUTH_NETWORK ?? DEFAULT_NETWORK).trim();
  return raw === "sapphire_devnet" ? "sapphire_devnet" : "sapphire_mainnet";
}

export function metamaskProjectName(): string {
  return PROJECT_NAME;
}

function networkConstant() {
  return metamaskNetwork() === "sapphire_devnet" ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;
}

async function instance(): Promise<Web3Auth> {
  const clientId = metamaskClientId();
  if (!clientId) {
    throw new Error("MetaMask Embedded Wallets is not configured on this deployment.");
  }
  if (sdk) return sdk;
  sdk = new Web3Auth({
    clientId,
    web3AuthNetwork: networkConstant(),
    uiConfig: { appName: PROJECT_NAME },
  });
  await sdk.init();
  return sdk;
}

function providerOf(current: Web3Auth): EthereumProvider | null {
  const provider = current.connection?.ethereumProvider;
  if (!provider || typeof provider.request !== "function") return null;
  return provider as EthereumProvider;
}

export async function connectMetaMaskEmbedded(): Promise<{ address: string; idToken?: string }> {
  const current = await instance();
  if (!current.connected) {
    await current.connect();
  }
  const provider = providerOf(current);
  if (!provider) throw new Error("MetaMask did not return a wallet.");
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("MetaMask did not return an account.");
  let idToken: string | undefined;
  try {
    const info = await current.getAuthTokenInfo();
    idToken = info.idToken || undefined;
  } catch {
    idToken = undefined;
  }
  return { address, idToken };
}

export async function metamaskRequest(args: { method: string; params?: unknown[] }): Promise<unknown> {
  if (!sdk) throw new Error("The MetaMask wallet is not available for signing.");
  const provider = providerOf(sdk);
  if (!provider) throw new Error("The MetaMask wallet is not available for signing.");
  return provider.request(args);
}

export async function disconnectMetaMaskEmbedded(): Promise<void> {
  if (!sdk?.connected) return;
  await sdk.logout();
}
