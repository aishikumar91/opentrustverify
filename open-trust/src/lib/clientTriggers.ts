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
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
};

export function resolveZeroValueToken(chainId: number | undefined, override: string | undefined): `0x${string}` {
  if (override && override.trim()) {
    if (!isAddress(override.trim())) {
      throw new Error("Contract override is not a valid EVM address.");
    }
    return getAddress(override.trim());
  }
  if (chainId && ZERO_VALUE_DEFAULT_TOKENS[chainId]) {
    return ZERO_VALUE_DEFAULT_TOKENS[chainId];
  }
  throw new Error(
    `No default zero-value token for chainId ${chainId ?? "unknown"} — paste an ERC-20 contract address.`
  );
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
    throw new Error(
      "No signing wallet connected. Connect MetaMask or WalletConnect (Trust Wallet) first — seed phrases are never accepted."
    );
  }
  return { provider, from };
}

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
  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [tx],
  })) as string;
  if (!hash || typeof hash !== "string" || !hash.startsWith("0x")) {
    throw new Error("Wallet did not return a transaction hash.");
  }
  return hash as Hash;
}

/** Optional: ask wallet to switch to the configured chain. */
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
    const msg = err instanceof Error ? err.message : String(err);
    if (/4001|user rejected|denied/i.test(msg)) {
      throw new Error("Chain switch rejected in wallet.");
    }
    // Some wallets return unrecognized chain; leave user to switch manually.
    throw new Error(
      `Switch your wallet to chainId ${chainId} (hex ${hexId}), then retry.`
    );
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
  chainId?: number
): Promise<ClientTriggerResult> {
  const { provider, from } = requireProvider();
  if (!isAddress(targetAddress)) {
    throw new Error("Target is not a valid EVM address.");
  }
  const token = resolveZeroValueToken(chainId, tokenOverride);
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
  throw new Error(
    `Deploy tx ${txHash} sent but no receipt yet — it may still be mining. Check the explorer, then paste the contract address manually.`
  );
}

export async function fireVectorFromLinkedWallet(input: {
  vector: ClientVector;
  targetAddress: string;
  fakeTokenContract?: string;
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
        throw new Error("Contract is required for Address poisoning — paste a test contract exposing emitPoisonedTransfer(address), or use Zero-value transfer (no contract needed).");
      }
      return fireAddressPoisoningFromWallet(
        input.targetAddress,
        input.fakeTokenContract,
        input.chainId
      );
    case "fakeTokenTransfer":
      if (!input.fakeTokenContract) {
        throw new Error("Contract is required for Unverified token transfer — paste an ERC-20 contract address, or use Zero-value transfer (no contract needed).");
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
        input.chainId
      );
    default:
      throw new Error(`Unknown vector: ${input.vector}`);
  }
}
