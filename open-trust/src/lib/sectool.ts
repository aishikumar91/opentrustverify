/**
 * MetaMask Embedded Wallets (Web3Auth) for the "sectool" project.
 * Client-only — import dynamically from LinkWallet click handlers.
 */

import { Web3Auth, WEB3AUTH_NETWORK } from "@web3auth/modal";
import type { Eip1193Provider } from "./walletProvider";

export const SECTOOL_PROJECT_NAME = "sectool";
const DEFAULT_NETWORK = "sapphire_mainnet";
/** Public client id for sectool (safe in the browser). */
export const SECTOOL_PUBLIC_CLIENT_ID =
  "BFQnBp6tI9LtWdhNGIkBum0O2pDUefxYnQboLBIxnWV1oaAEZOJknjf6zQK5OEdai8sv9BMZR78Bx-Gk1UBwO2M";

type SectoolResult = {
  address: string;
  provider: Eip1193Provider;
  idToken?: string;
};

let sdk: Web3Auth | null = null;
let inflight: Promise<SectoolResult> | null = null;

function networkConstant(network: string) {
  return network === "sapphire_devnet"
    ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET
    : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;
}

async function instance(clientId: string, network: string): Promise<Web3Auth> {
  if (sdk) return sdk;
  sdk = new Web3Auth({
    clientId,
    web3AuthNetwork: networkConstant(network),
    uiConfig: { appName: SECTOOL_PROJECT_NAME },
  });
  await sdk.init();
  return sdk;
}

function ethProvider(current: Web3Auth): Eip1193Provider | null {
  const provider = current.connection?.ethereumProvider as Eip1193Provider | undefined;
  if (!provider || typeof provider.request !== "function") return null;
  return provider;
}

export function connectSectool(opts?: {
  clientId?: string | null;
  network?: string | null;
}): Promise<SectoolResult> {
  if (!inflight) {
    inflight = openSectool(opts).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function openSectool(opts?: {
  clientId?: string | null;
  network?: string | null;
}): Promise<SectoolResult> {
  const clientId = (opts?.clientId || "").trim() || SECTOOL_PUBLIC_CLIENT_ID;
  const network = (opts?.network || "").trim() || DEFAULT_NETWORK;
  const current = await instance(clientId, network);
  if (!current.connected) {
    await current.connect();
  }
  const provider = ethProvider(current);
  if (!provider) throw new Error("sectool did not return a wallet provider.");
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  const address = accounts?.[0];
  if (!address) throw new Error("sectool did not return an account.");
  let idToken: string | undefined;
  try {
    const info = await current.getAuthTokenInfo();
    idToken = info.idToken || undefined;
  } catch {
    idToken = undefined;
  }
  return { address, provider, idToken };
}

export async function disconnectSectool(): Promise<void> {
  if (!sdk?.connected) return;
  await sdk.logout();
}
