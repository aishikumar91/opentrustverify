/**
 * chain.ts
 *
 * Builds the active chain definition from environment variables instead of
 * hardcoding a testnet import, so liveEngine.ts and verifierService.ts can
 * target mainnet or any EVM testnet purely via .env.local — no code change
 * needed to switch networks.
 */

import { defineChain } from "viem";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in the environment.`);
  return value;
}

export const activeChain = defineChain({
  id: Number(process.env.CHAIN_ID ?? 8453), // defaults to Base mainnet if unset
  name: process.env.CHAIN_NAME ?? "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL ?? "https://mainnet.base.org"] },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: process.env.BLOCK_EXPLORER_BASE ?? "https://basescan.org",
    },
  },
});

export const isMainnet = (process.env.CHAIN_ID ?? "8453") === "8453" ||
  (process.env.CHAIN_NAME ?? "").toLowerCase().includes("mainnet");

export function requireRpcUrl(): string {
  return requireEnv("RPC_URL");
}
