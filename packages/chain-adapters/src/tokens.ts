import type { KnownAsset } from "./registry.js";

function erc20(
  chain: string,
  network: string,
  symbol: string,
  contract: string,
  decimals: number,
  name?: string
): KnownAsset {
  return { chain, network, type: "erc20", symbol, contract, decimals, name: name ?? symbol };
}

function native(chain: string, network: string, symbol: string, decimals: number): KnownAsset {
  return { chain, network, type: "native", symbol, decimals };
}

/** Convenience catalog. Verification accepts any contract, not only these. */
export const KNOWN_ASSETS: KnownAsset[] = [
  native("ethereum", "mainnet", "ETH", 18),
  native("ethereum", "sepolia", "ETH", 18),
  erc20("ethereum", "mainnet", "USDC", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6, "USD Coin"),
  erc20("ethereum", "mainnet", "USDT", "0xdac17f958d2ee523a2206206994597c13d831ec7", 6, "Tether USD"),
  erc20("ethereum", "mainnet", "DAI", "0x6b175474e89094c44da98b954eedeac495271d0f", 18, "Dai Stablecoin"),
  erc20("ethereum", "mainnet", "WETH", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", 18, "Wrapped Ether"),
  erc20("ethereum", "sepolia", "USDC", "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238", 6, "USD Coin"),
  native("polygon", "mainnet", "POL", 18),
  erc20("polygon", "mainnet", "USDC", "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", 6),
  erc20("polygon", "mainnet", "USDT", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", 6),
  native("arbitrum", "mainnet", "ETH", 18),
  erc20("arbitrum", "mainnet", "USDC", "0xaf88d065e77c8cc2239327c5edb3a432268e5831", 6),
  erc20("arbitrum", "mainnet", "USDT", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", 6),
  native("optimism", "mainnet", "ETH", 18),
  erc20("optimism", "mainnet", "USDC", "0x0b2c639c533813f4aa9d7837caf62653d097ff85", 6),
  native("base", "mainnet", "ETH", 18),
  erc20("base", "mainnet", "USDC", "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", 6),
  native("bnb", "mainnet", "BNB", 18),
  erc20("bnb", "mainnet", "USDT", "0x55d398326f99059ff775485246999027b3197955", 18),
  erc20("bnb", "mainnet", "USDC", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", 18),
  native("avalanche", "mainnet", "AVAX", 18),
  erc20("avalanche", "mainnet", "USDC", "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", 6),
  native("bitcoin", "mainnet", "BTC", 8),
  native("bitcoin", "testnet", "BTC", 8),
  native("bitcoin", "signet", "BTC", 8),
  native("solana", "mainnet", "SOL", 9),
  {
    chain: "solana",
    network: "mainnet",
    type: "other",
    symbol: "USDC",
    decimals: 6,
    contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    name: "USD Coin",
  },
  native("tron", "mainnet", "TRX", 6),
  {
    chain: "tron",
    network: "mainnet",
    type: "other",
    symbol: "USDT",
    decimals: 6,
    contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    name: "Tether USD",
  },
  native("mock", "local", "ETH", 18),
  erc20("ethereum", "sepolia", "USDC", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6),
];

export function catalogAssets(chain?: string, network?: string): KnownAsset[] {
  const c = chain?.toLowerCase();
  const n = network?.toLowerCase();
  return KNOWN_ASSETS.filter((a) => {
    if (c && a.chain !== c) return false;
    if (n && a.network !== n) return false;
    return true;
  });
}
