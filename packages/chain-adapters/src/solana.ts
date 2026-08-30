import type {
  AssetEvidence,
  BalanceEvidence,
  BlockEvidence,
  ChainAdapter,
  FinalityEvidence,
  NormalizedEvidence,
  ReceiptEvidence,
  TransactionEvidence,
  TransferEvidence,
} from "./types.js";
import { resolveRpcUrl } from "./registry.js";

const SOL: AssetEvidence = { type: "native", symbol: "SOL", decimals: 9, name: "Solana" };
const DEMO_TX = "SoLdemo000000000000000000000000000000000000000000000000000000001";
const DEMO_TO = "So11111111111111111111111111111111111111112";

type SolTx = {
  slot?: number;
  meta?: {
    err: unknown;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: Array<{
      mint: string;
      owner?: string;
      uiTokenAmount: { amount: string; decimals: number };
    }>;
    postTokenBalances?: Array<{
      mint: string;
      owner?: string;
      uiTokenAmount: { amount: string; decimals: number };
    }>;
  };
  transaction?: {
    message?: {
      accountKeys?: Array<string | { pubkey: string }>;
    };
  };
};

async function solRpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Solana RPC HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`Solana RPC: ${body.error.message}`);
  return body.result as T;
}

function keyOf(k: string | { pubkey: string }): string {
  return typeof k === "string" ? k : k.pubkey;
}

export class SolanaAdapter implements ChainAdapter {
  readonly chainId = "solana";
  readonly network: string;
  readonly isLive: boolean;
  private readonly rpc: string | undefined;
  private readonly required: number;

  constructor(network = "mainnet", rpcUrl?: string) {
    this.network = network;
    this.rpc = resolveRpcUrl("solana", network, rpcUrl);
    this.isLive = Boolean(this.rpc);
    this.required = network === "devnet" ? 16 : 32;
  }

  async getTransaction(hash: string): Promise<TransactionEvidence> {
    if (!this.rpc) return this.mockTx(hash);
    const tx = await solRpc<SolTx | null>(this.rpc, "getTransaction", [
      hash,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx) return { hash, from: "", to: null, blockNumber: null, status: "unknown", value: "0" };
    const keys = (tx.transaction?.message?.accountKeys ?? []).map(keyOf);
    return {
      hash,
      from: keys[0] ?? "",
      to: keys[1] ?? null,
      blockNumber: tx.slot ?? null,
      status: tx.slot ? "included" : "pending",
      value: String((tx.meta?.postBalances?.[1] ?? 0) - (tx.meta?.preBalances?.[1] ?? 0)),
    };
  }

  async getReceipt(hash: string): Promise<ReceiptEvidence | null> {
    if (!this.rpc) return hash === DEMO_TX ? { hash, status: "success", blockNumber: 100, gasUsed: "0", logs: [] } : null;
    const tx = await solRpc<SolTx | null>(this.rpc, "getTransaction", [
      hash,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx) return null;
    return {
      hash,
      status: tx.meta?.err ? "reverted" : "success",
      blockNumber: tx.slot ?? 0,
      gasUsed: "0",
      logs: [],
    };
  }

  async getBlock(number: number): Promise<BlockEvidence> {
    return { number, hash: `sol-slot-${number}`, timestamp: Math.floor(Date.now() / 1000) };
  }

  async getBalance(address: string, asset: string, block = 0): Promise<BalanceEvidence> {
    if (!this.rpc) {
      return { address, asset, balance: address === DEMO_TO ? "1000000000" : "0", blockNumber: block };
    }
    if (!asset || asset === "native" || asset === "sol") {
      const out = await solRpc<{ value: number }>(this.rpc, "getBalance", [address]);
      return { address, asset: "native", balance: String(out.value), blockNumber: block };
    }
    const out = await solRpc<{ value: Array<{ account: { data: { parsed: { info: { tokenAmount: { amount: string } } } } } }> }>(
      this.rpc,
      "getTokenAccountsByOwner",
      [address, { mint: asset }, { encoding: "jsonParsed" }]
    );
    const amount = out.value[0]?.account.data.parsed.info.tokenAmount.amount ?? "0";
    return { address, asset, balance: amount, blockNumber: block };
  }

  async getTokenMetadata(contract: string): Promise<AssetEvidence> {
    if (!contract || contract === "native") return SOL;
    return { type: "other", contract, symbol: "SPL", decimals: 6, name: "SPL token" };
  }

  async getTransferEvents(hash: string): Promise<TransferEvidence[]> {
    if (!this.rpc) return this.mockTransfers(hash);
    const tx = await solRpc<SolTx | null>(this.rpc, "getTransaction", [
      hash,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx?.meta) return [];
    const keys = (tx.transaction?.message?.accountKeys ?? []).map(keyOf);
    const events: TransferEvidence[] = [];
    const pre = tx.meta.preBalances ?? [];
    const post = tx.meta.postBalances ?? [];
    keys.forEach((key, i) => {
      const delta = (post[i] ?? 0) - (pre[i] ?? 0);
      if (delta > 0) {
        events.push({ from: keys[0] ?? "", to: key, amount: String(delta), asset: "native", logIndex: i });
      }
    });
    const preTok = new Map(
      (tx.meta.preTokenBalances ?? []).map((b) => [`${b.owner}:${b.mint}`, BigInt(b.uiTokenAmount.amount)])
    );
    (tx.meta.postTokenBalances ?? []).forEach((b, i) => {
      const before = preTok.get(`${b.owner}:${b.mint}`) ?? 0n;
      const after = BigInt(b.uiTokenAmount.amount);
      const delta = after - before;
      if (delta > 0n && b.owner) {
        events.push({
          from: keys[0] ?? "",
          to: b.owner,
          amount: delta.toString(),
          asset: b.mint,
          logIndex: 1000 + i,
        });
      }
    });
    return events;
  }

  async getFinalityState(blockNumber: number): Promise<FinalityEvidence> {
    if (!this.rpc) {
      return { state: "FINAL", confirmations: this.required, required: this.required, headBlock: blockNumber + this.required };
    }
    const slot = await solRpc<number>(this.rpc, "getSlot", []);
    const confirmations = blockNumber > 0 ? Math.max(0, slot - blockNumber) : 0;
    return {
      state: confirmations >= this.required ? "FINAL" : "PENDING",
      confirmations,
      required: this.required,
      headBlock: slot,
    };
  }

  async normalizeEvidence(hash: string, recipient: string, assetHint?: string): Promise<NormalizedEvidence> {
    const tx = await this.getTransaction(hash);
    const receipt = await this.getReceipt(hash);
    const transfers = await this.getTransferEvents(hash);
    const matched =
      transfers.find((t) => t.to === recipient && (!assetHint || assetHint === "native" || t.asset === assetHint)) ??
      transfers.find((t) => t.to === recipient);
    const asset =
      matched && matched.asset !== "native"
        ? await this.getTokenMetadata(matched.asset)
        : SOL;
    const finality = await this.getFinalityState(tx.blockNumber ?? 0);
    const amount = matched?.amount ?? "0";
    return {
      transaction: tx,
      receipt,
      transfers,
      asset,
      balanceBefore: { address: recipient, asset: asset.contract ?? "native", balance: "0", blockNumber: Math.max(0, (tx.blockNumber ?? 1) - 1) },
      balanceAfter: { address: recipient, asset: asset.contract ?? "native", balance: amount, blockNumber: tx.blockNumber ?? 0 },
      finality,
    };
  }

  private mockTx(hash: string): TransactionEvidence {
    const known = hash === DEMO_TX;
    return {
      hash,
      from: "11111111111111111111111111111111",
      to: DEMO_TO,
      blockNumber: known ? 100 : null,
      status: known ? "included" : "unknown",
      value: known ? "1000000000" : "0",
    };
  }

  private mockTransfers(hash: string): TransferEvidence[] {
    if (hash !== DEMO_TX) return [];
    return [{ from: "11111111111111111111111111111111", to: DEMO_TO, amount: "1000000000", asset: "native", logIndex: 0 }];
  }
}

export const SOLANA_DEMO = { hash: DEMO_TX, recipient: DEMO_TO, amount: "1000000000" };
