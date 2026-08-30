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

const TRX: AssetEvidence = { type: "native", symbol: "TRX", decimals: 6, name: "Tron" };
const DEMO_TX = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DEMO_TO = "TDemoRecipient000000000000000000000";

type TronTx = {
  txID?: string;
  ret?: Array<{ contractRet?: string }>;
  raw_data?: {
    contract?: Array<{
      parameter?: {
        value?: {
          owner_address?: string;
          to_address?: string;
          amount?: number;
          contract_address?: string;
          data?: string;
        };
      };
    }>;
  };
  blockNumber?: number;
};

async function tronPost<T>(base: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Tron HTTP ${res.status}`);
  return (await res.json()) as T;
}

export class TronAdapter implements ChainAdapter {
  readonly chainId = "tron";
  readonly network: string;
  readonly isLive: boolean;
  private readonly base: string | undefined;
  private readonly required: number;

  constructor(network = "mainnet", apiUrl?: string) {
    this.network = network;
    this.base = resolveRpcUrl("tron", network, apiUrl);
    this.isLive = Boolean(this.base);
    this.required = network === "nile" ? 12 : 19;
  }

  async getTransaction(hash: string): Promise<TransactionEvidence> {
    if (!this.base) return this.mockTx(hash);
    const tx = await tronPost<TronTx>(this.base, "/wallet/gettransactionbyid", { value: hash });
    if (!tx.txID) return { hash, from: "", to: null, blockNumber: null, status: "unknown", value: "0" };
    const value = tx.raw_data?.contract?.[0]?.parameter?.value;
    return {
      hash: tx.txID,
      from: value?.owner_address ?? "",
      to: value?.to_address ?? null,
      blockNumber: tx.blockNumber ?? null,
      status: tx.blockNumber ? "included" : "pending",
      value: String(value?.amount ?? 0),
    };
  }

  async getReceipt(hash: string): Promise<ReceiptEvidence | null> {
    if (!this.base) return hash.toLowerCase() === DEMO_TX ? { hash, status: "success", blockNumber: 100, gasUsed: "0", logs: [] } : null;
    const info = await tronPost<{ id?: string; blockNumber?: number; receipt?: { result?: string } }>(
      this.base,
      "/wallet/gettransactioninfobyid",
      { value: hash }
    );
    if (!info.id && !info.blockNumber) return null;
    return {
      hash,
      status: info.receipt?.result === "FAILED" ? "reverted" : "success",
      blockNumber: info.blockNumber ?? 0,
      gasUsed: "0",
      logs: [],
    };
  }

  async getBlock(number: number): Promise<BlockEvidence> {
    return { number, hash: `tron-block-${number}`, timestamp: Math.floor(Date.now() / 1000) };
  }

  async getBalance(address: string, asset: string, block = 0): Promise<BalanceEvidence> {
    if (!this.base) {
      return { address, asset, balance: address === DEMO_TO ? "1000000" : "0", blockNumber: block };
    }
    const acc = await tronPost<{ balance?: number }>(this.base, "/wallet/getaccount", { address, visible: true });
    return { address, asset: "native", balance: String(acc.balance ?? 0), blockNumber: block };
  }

  async getTokenMetadata(contract: string): Promise<AssetEvidence> {
    if (!contract || contract === "native") return TRX;
    return { type: "other", contract, symbol: "TRC20", decimals: 6, name: "TRC-20" };
  }

  async getTransferEvents(hash: string): Promise<TransferEvidence[]> {
    if (!this.base) return this.mockTransfers(hash);
    const tx = await tronPost<TronTx>(this.base, "/wallet/gettransactionbyid", { value: hash });
    const value = tx.raw_data?.contract?.[0]?.parameter?.value;
    if (!value?.to_address) return [];
    return [
      {
        from: value.owner_address ?? "",
        to: value.to_address,
        amount: String(value.amount ?? 0),
        asset: value.contract_address ?? "native",
        logIndex: 0,
      },
    ];
  }

  async getFinalityState(blockNumber: number): Promise<FinalityEvidence> {
    if (!this.base) {
      return { state: "FINAL", confirmations: this.required, required: this.required, headBlock: blockNumber + this.required };
    }
    const now = await tronPost<{ block_header?: { raw_data?: { number?: number } } }>(
      this.base,
      "/wallet/getnowblock",
      {}
    );
    const head = now.block_header?.raw_data?.number ?? blockNumber;
    const confirmations = blockNumber > 0 ? Math.max(0, head - blockNumber) : 0;
    return {
      state: confirmations >= this.required ? "FINAL" : "PENDING",
      confirmations,
      required: this.required,
      headBlock: head,
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
      matched && matched.asset !== "native" ? await this.getTokenMetadata(matched.asset) : TRX;
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
    const known = hash.toLowerCase() === DEMO_TX;
    return {
      hash,
      from: "TFrom000000000000000000000000000000",
      to: DEMO_TO,
      blockNumber: known ? 100 : null,
      status: known ? "included" : "unknown",
      value: known ? "1000000" : "0",
    };
  }

  private mockTransfers(hash: string): TransferEvidence[] {
    if (hash.toLowerCase() !== DEMO_TX) return [];
    return [{ from: "TFrom000000000000000000000000000000", to: DEMO_TO, amount: "1000000", asset: "native", logIndex: 0 }];
  }
}

export const TRON_DEMO = { hash: DEMO_TX, recipient: DEMO_TO, amount: "1000000" };
