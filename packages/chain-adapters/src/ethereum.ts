import type { ChainAdapter } from "./types.js";
import { BitcoinAdapter } from "./bitcoin.js";
import { EthereumAdapter, EvmAdapter } from "./evm.js";
import { SolanaAdapter } from "./solana.js";
import { TronAdapter } from "./tron.js";
import { getChain } from "./registry.js";

export { EthereumAdapter, EvmAdapter } from "./evm.js";

export function createAdapter(chain: string, network: string, rpcUrl?: string): ChainAdapter {
  const id = chain.toLowerCase();
  if (id === "mock") return new EthereumAdapter("local");
  const def = getChain(id);
  if (!def) throw new Error(`Unsupported chain: ${chain}`);
  switch (def.family) {
    case "evm":
      return new EvmAdapter(def.id, network, rpcUrl);
    case "bitcoin":
      return new BitcoinAdapter(network, rpcUrl);
    case "solana":
      return new SolanaAdapter(network, rpcUrl);
    case "tron":
      return new TronAdapter(network, rpcUrl);
    default: {
      const exhausted: never = def.family;
      throw new Error(`Unsupported family: ${exhausted}`);
    }
  }
}
