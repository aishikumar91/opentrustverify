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
import { MockChainAdapter } from "./mock.js";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function rpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`RPC error: ${body.error.message}`);
  return body.result as T;
}

function hexToBigInt(hex?: string | null): bigint {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

function topicAddress(topic: string): string {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

/**
 * Ethereum adapter.
 * - No RPC URL → MockChainAdapter (offline demos).
 * - With ETH_RPC_URL → live JSON-RPC for tx/receipt/logs/finality.
 */
export class EthereumAdapter implements ChainAdapter {
  readonly chainId = "ethereum";
  readonly network: string;
  private readonly rpcUrl: string | undefined;
  private readonly mock: MockChainAdapter;
  private readonly requiredConfirmations: number;

  constructor(network = "sepolia", rpcUrl?: string, requiredConfirmations = 12) {
    this.network = network;
    this.rpcUrl =
      rpcUrl ?? (typeof process !== "undefined" ? process.env?.ETH_RPC_URL : undefined);
    this.mock = new MockChainAdapter(network);
    this.requiredConfirmations = requiredConfirmations;
  }

  get isLive(): boolean {
    return Boolean(this.rpcUrl);
  }

  /** True when responses come from the mock path (no live RPC). */
  get isMock(): boolean {
    return !this.rpcUrl;
  }

  private requireRpc(): string {
    if (!this.rpcUrl) throw new Error("ETH_RPC_URL required for live adapter methods");
    return this.rpcUrl;
  }

  async getTransaction(hash: string): Promise<TransactionEvidence> {
    if (!this.rpcUrl) return this.mock.getTransaction(hash);
    const tx = await rpc<{
      hash: string;
      from: string;
      to: string | null;
      blockNumber: string | null;
      value: string;
      input: string;
    } | null>(this.requireRpc(), "eth_getTransactionByHash", [hash]);
    if (!tx) {
      return {
        hash,
        from: "0x",
        to: null,
        blockNumber: null,
        status: "unknown",
        value: "0",
      };
    }
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      blockNumber: tx.blockNumber ? Number(hexToBigInt(tx.blockNumber)) : null,
      status: tx.blockNumber ? "included" : "pending",
      value: hexToBigInt(tx.value).toString(),
      input: tx.input,
    };
  }

  async getReceipt(hash: string): Promise<ReceiptEvidence | null> {
    if (!this.rpcUrl) return this.mock.getReceipt(hash);
    const receipt = await rpc<{
      transactionHash: string;
      status: string;
      blockNumber: string;
      gasUsed: string;
      logs: Array<{ address: string; topics: string[]; data: string }>;
    } | null>(this.requireRpc(), "eth_getTransactionReceipt", [hash]);
    if (!receipt) return null;
    return {
      hash: receipt.transactionHash,
      status: hexToBigInt(receipt.status) === 1n ? "success" : "reverted",
      blockNumber: Number(hexToBigInt(receipt.blockNumber)),
      gasUsed: hexToBigInt(receipt.gasUsed).toString(),
      logs: receipt.logs ?? [],
    };
  }

  async getBlock(number: number): Promise<BlockEvidence> {
    if (!this.rpcUrl) return this.mock.getBlock(number);
    const block = await rpc<{ number: string; hash: string; timestamp: string }>(
      this.requireRpc(),
      "eth_getBlockByNumber",
      [`0x${number.toString(16)}`, false]
    );
    return {
      number: Number(hexToBigInt(block.number)),
      hash: block.hash,
      timestamp: Number(hexToBigInt(block.timestamp)),
    };
  }

  async getBalance(address: string, asset: string, block?: number): Promise<BalanceEvidence> {
    if (!this.rpcUrl) return this.mock.getBalance(address, asset, block);
    const tag = block != null ? `0x${block.toString(16)}` : "latest";
    if (!asset || asset === "native" || asset === "eth") {
      const bal = await rpc<string>(this.requireRpc(), "eth_getBalance", [address, tag]);
      return {
        address,
        asset: "native",
        balance: hexToBigInt(bal).toString(),
        blockNumber: block ?? 0,
      };
    }
    // ERC-20 balanceOf(address)
    const data = `0x70a08231${address.replace(/^0x/, "").toLowerCase().padStart(64, "0")}`;
    const bal = await rpc<string>(this.requireRpc(), "eth_call", [
      { to: asset, data },
      tag,
    ]);
    return {
      address,
      asset,
      balance: hexToBigInt(bal).toString(),
      blockNumber: block ?? 0,
    };
  }

  async getTokenMetadata(contract: string): Promise<AssetEvidence> {
    if (!this.rpcUrl) return this.mock.getTokenMetadata(contract);
    // Best-effort; symbol/decimals may fail for non-ERC20
    try {
      const decimalsHex = await rpc<string>(this.requireRpc(), "eth_call", [
        { to: contract, data: "0x313ce567" },
        "latest",
      ]);
      return {
        type: "erc20",
        contract,
        symbol: "TOKEN",
        decimals: Number(hexToBigInt(decimalsHex)),
        name: "Token",
      };
    } catch {
      return { type: "erc20", contract, symbol: "TOKEN", decimals: 18 };
    }
  }

  async getTransferEvents(hash: string): Promise<TransferEvidence[]> {
    if (!this.rpcUrl) return this.mock.getTransferEvents(hash);
    const receipt = await this.getReceipt(hash);
    if (!receipt) return [];
    return receipt.logs
      .filter((l) => l.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC && l.topics.length >= 3)
      .map((l, i) => ({
        from: topicAddress(l.topics[1]!),
        to: topicAddress(l.topics[2]!),
        amount: hexToBigInt(l.data).toString(),
        asset: l.address.toLowerCase(),
        logIndex: i,
      }));
  }

  async getFinalityState(blockNumber: number): Promise<FinalityEvidence> {
    if (!this.rpcUrl) return this.mock.getFinalityState(blockNumber);
    const latestHex = await rpc<string>(this.requireRpc(), "eth_blockNumber", []);
    const head = Number(hexToBigInt(latestHex));
    const confirmations = Math.max(0, head - blockNumber);
    return {
      state: confirmations >= this.requiredConfirmations ? "FINAL" : "PENDING",
      confirmations,
      required: this.requiredConfirmations,
      headBlock: head,
    };
  }

  async normalizeEvidence(
    hash: string,
    recipient: string,
    assetHint?: string
  ): Promise<NormalizedEvidence> {
    if (!this.rpcUrl) return this.mock.normalizeEvidence(hash, recipient, assetHint);
    const tx = await this.getTransaction(hash);
    const receipt = await this.getReceipt(hash);
    const transfers = await this.getTransferEvents(hash);
    const matched = transfers.find((t) => t.to.toLowerCase() === recipient.toLowerCase());
    const assetAddr = assetHint ?? matched?.asset ?? transfers[0]?.asset;
    const asset = assetAddr
      ? await this.getTokenMetadata(assetAddr)
      : ({ type: "native", symbol: "ETH", decimals: 18 } as AssetEvidence);
    const finality = await this.getFinalityState(tx.blockNumber ?? 0);
    const block = tx.blockNumber ?? 0;
    const assetKey = asset.contract ?? "native";
    const [balanceBefore, balanceAfter] = await Promise.all([
      block > 0
        ? this.getBalance(recipient, assetKey, block - 1)
        : Promise.resolve({
            address: recipient,
            asset: assetKey,
            balance: "0",
            blockNumber: 0,
          }),
      block > 0
        ? this.getBalance(recipient, assetKey, block)
        : Promise.resolve({
            address: recipient,
            asset: assetKey,
            balance: "0",
            blockNumber: 0,
          }),
    ]);
    return {
      transaction: tx,
      receipt,
      transfers,
      asset,
      balanceBefore,
      balanceAfter,
      finality,
    };
  }
}

export function createAdapter(chain: string, network: string, rpcUrl?: string): ChainAdapter {
  if (chain === "ethereum" || chain === "mock") {
    return new EthereumAdapter(network, chain === "mock" ? undefined : rpcUrl);
  }
  throw new Error(`Unsupported chain: ${chain}`);
}
