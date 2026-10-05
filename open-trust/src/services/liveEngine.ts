/**
 * liveEngine.ts
 *
 * Admin-only trigger service. Broadcasts real transactions on the
 * configured network (Base mainnet by default — see .env.example) against
 * addresses the admin controls, so the verification engine has live,
 * non-simulated data to analyze instead of mocked fixtures.
 *
 * Safety boundary: every exported function calls assertAllowlisted() before
 * touching the signer. Do not add a path that signs or sends before that
 * check runs.
 */

import { createWalletClient, createPublicClient, http, parseEther, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { activeChain, isMainnet } from "../lib/chain";
import { assertAllowlisted } from "../lib/allowlist";

function getSigner() {
  const key = process.env.ADMIN_SIGNER_PRIVATE_KEY;
  if (!key || key === "0xreplace_me") {
    throw new Error("ADMIN_SIGNER_PRIVATE_KEY is not configured.");
  }
  const account = privateKeyToAccount(key as `0x${string}`);
  const rpcUrl = process.env.RPC_URL ?? activeChain.rpcUrls.default.http[0];

  const wallet = createWalletClient({ account, chain: activeChain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: activeChain, transport: http(rpcUrl) });
  return { account, wallet, publicClient };
}

if (isMainnet && process.env.ALLOW_MAINNET !== "true") {
  // Extra opt-in beyond just setting CHAIN_ID, so a stale .env from a demo
  // doesn't silently start signing real mainnet transactions.
  throw new Error(
    "CHAIN_ID resolves to mainnet. Set ALLOW_MAINNET=true in your env " +
      "once ADMIN_ALLOWLIST and ADMIN_SIGNER_PRIVATE_KEY are confirmed, " +
      "to broadcast real transactions."
  );
}

export interface TriggerResult {
  txHash: Hash;
  explorerUrl: string;
  vector: "MEMPOOL_SPOOF_LURE" | "ADDRESS_POISONING" | "FAKE_TOKEN_TRANSFER";
  targetAddress: string;
  broadcastAt: string;
}

function explorerLink(txHash: string): string {
  const base = process.env.BLOCK_EXPLORER_BASE ?? activeChain.blockExplorers.default.url;
  return `${base}/tx/${txHash}`;
}

/**
 * Constructs and signs a real transaction with maxFeePerGas set below the
 * current network base fee, so it sits stuck in the pending mempool —
 * a live, visible "incoming funds" lure for the demo.
 */
export async function triggerLowGasPendingLure(
  targetAddress: string,
  amountEth: string
): Promise<TriggerResult> {
  assertAllowlisted(targetAddress);
  const { wallet, publicClient, account } = getSigner();

  const baseFee = (await publicClient.getBlock()).baseFeePerGas ?? 1_000_000n;
  const starvedFee = baseFee / 4n; // deliberately under current base fee

  const txHash = await wallet.sendTransaction({
    account,
    to: targetAddress as `0x${string}`,
    value: parseEther(amountEth),
    maxFeePerGas: starvedFee,
    maxPriorityFeePerGas: 1n,
  });

  return {
    txHash,
    explorerUrl: explorerLink(txHash),
    vector: "MEMPOOL_SPOOF_LURE",
    targetAddress,
    broadcastAt: new Date().toISOString(),
  };
}

/**
 * Calls a deployed test ERC-20/poisoning contract to emit a Transfer event
 * with zero actual balance delta against the target — the classic
 * address-poisoning pattern, run against an admin-controlled wallet.
 *
 * `fakeTokenContract` must itself be a contract the admin deployed for this
 * purpose; this function does not deploy one for you.
 */
export async function triggerZeroValuePoisoning(
  targetAddress: string,
  fakeTokenContract: string
): Promise<TriggerResult> {
  assertAllowlisted(targetAddress);
  const { wallet, account } = getSigner();

  // Minimal ABI: a test contract exposing emitPoisonedTransfer(address)
  // that emits Transfer(from, to, amount) without moving real balance.
  const abi = [
    {
      name: "emitPoisonedTransfer",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "to", type: "address" }],
      outputs: [],
    },
  ] as const;

  const txHash = await wallet.writeContract({
    account,
    address: fakeTokenContract as `0x${string}`,
    abi,
    functionName: "emitPoisonedTransfer",
    args: [targetAddress as `0x${string}`],
  });

  return {
    txHash,
    explorerUrl: explorerLink(txHash),
    vector: "ADDRESS_POISONING",
    targetAddress,
    broadcastAt: new Date().toISOString(),
  };
}

/**
 * Interacts with an unverified/test ERC-20 contract to execute a transfer
 * toward the target, for the "unverified fake token" detection path.
 */
export async function triggerFakeTokenTransfer(
  targetAddress: string,
  fakeTokenContract: string,
  amount: string
): Promise<TriggerResult> {
  assertAllowlisted(targetAddress);
  const { wallet, account } = getSigner();

  const abi = [
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

  const txHash = await wallet.writeContract({
    account,
    address: fakeTokenContract as `0x${string}`,
    abi,
    functionName: "transfer",
    args: [targetAddress as `0x${string}`, BigInt(amount)],
  });

  return {
    txHash,
    explorerUrl: explorerLink(txHash),
    vector: "FAKE_TOKEN_TRANSFER",
    targetAddress,
    broadcastAt: new Date().toISOString(),
  };
}
