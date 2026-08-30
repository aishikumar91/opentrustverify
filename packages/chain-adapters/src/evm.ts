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
import { getChain, getNetwork, resolveRpcUrl } from "./registry.js";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TRANSFER_SINGLE =
  "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
const ERC721 = "0x80ac58cd";
const ERC1155 = "0xd9b67a26";

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

export function decodeAbiString(hex: string): string {
  if (!hex || hex === "0x") return "";
  const data = hex.replace(/^0x/, "");
  try {
    if (data.length === 64) {
      return Buffer.from(data, "hex").toString("utf8").replace(/\0/g, "").trim();
    }
    if (data.length >= 128) {
      const len = Number(BigInt(`0x${data.slice(64, 128)}`));
      if (!Number.isFinite(len) || len < 0 || len > 128) return "";
      return Buffer.from(data.slice(128, 128 + len * 2), "hex").toString("utf8").replace(/\0/g, "");
    }
  } catch {
    return "";
  }
  return "";
}

function isNativeHint(hint?: string): boolean {
  if (!hint) return false;
  const h = hint.toLowerCase();
  return h === "native" || h === "eth" || h === "bnb" || h === "pol" || h === "avax" || h === "matic";
}

function isAddress(value?: string): boolean {
  return Boolean(value && /^0x[0-9a-fA-F]{40}$/.test(value));
}

/**
 * Any EVM chain. Native coin plus ERC-20, ERC-721, and ERC-1155 from logs.
 * No RPC → mock path (tests and offline demos).
 */
export class EvmAdapter implements ChainAdapter {
  readonly chainId: string;
  readonly network: string;
  readonly isLive: boolean;
  private readonly rpcUrl: string | undefined;
  private readonly mock: MockChainAdapter;
  private readonly requiredConfirmations: number;
  private readonly nativeSymbol: string;

  constructor(chainId = "ethereum", network = "sepolia", rpcUrl?: string, requiredConfirmations?: number) {
    const def = getChain(chainId);
    this.chainId = def?.id ?? chainId;
    this.network = network;
    this.nativeSymbol = def?.nativeSymbol ?? "ETH";
    this.rpcUrl = resolveRpcUrl(this.chainId, network, rpcUrl);
    this.isLive = Boolean(this.rpcUrl);
    this.mock = new MockChainAdapter(network);
    this.requiredConfirmations =
      requiredConfirmations ?? getNetwork(this.chainId, network)?.confirmations ?? 12;
  }

  private requireRpc(): string {
    if (!this.rpcUrl) throw new Error("RPC URL required for live adapter methods");
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
      return { hash, from: "0x", to: null, blockNumber: null, status: "unknown", value: "0" };
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

  async getBalance(
    address: string,
    asset: string,
    block?: number,
    tokenId?: string
  ): Promise<BalanceEvidence> {
    if (!this.rpcUrl) return this.mock.getBalance(address, asset, block);
    const tag = block != null ? `0x${block.toString(16)}` : "latest";
    if (!asset || isNativeHint(asset)) {
      const bal = await rpc<string>(this.requireRpc(), "eth_getBalance", [address, tag]);
      return { address, asset: "native", balance: hexToBigInt(bal).toString(), blockNumber: block ?? 0 };
    }
    const addr = address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
    let data: string;
    if (tokenId) {
      const id = BigInt(tokenId).toString(16).padStart(64, "0");
      data = `0x00fdd58e${addr}${id}`;
    } else {
      data = `0x70a08231${addr}`;
    }
    const bal = await rpc<string>(this.requireRpc(), "eth_call", [{ to: asset, data }, tag]);
    return { address, asset, balance: hexToBigInt(bal).toString(), blockNumber: block ?? 0 };
  }

  async getTokenMetadata(contract: string): Promise<AssetEvidence> {
    if (!this.rpcUrl) return this.mock.getTokenMetadata(contract);
    const iface = await this.supportsInterface(contract);
    if (iface === "erc721") {
      const [symbol, name] = await Promise.all([this.callString(contract, "0x95d89b41"), this.callString(contract, "0x06fdde03")]);
      return { type: "erc721", contract, symbol: symbol || "NFT", decimals: 0, name: name || symbol || "NFT" };
    }
    if (iface === "erc1155") {
      return { type: "erc1155", contract, symbol: "ERC1155", decimals: 0, name: "ERC-1155" };
    }
    try {
      const [decimalsHex, symbol, name] = await Promise.all([
        rpc<string>(this.requireRpc(), "eth_call", [{ to: contract, data: "0x313ce567" }, "latest"]),
        this.callString(contract, "0x95d89b41"),
        this.callString(contract, "0x06fdde03"),
      ]);
      return {
        type: "erc20",
        contract,
        symbol: symbol || "TOKEN",
        decimals: Number(hexToBigInt(decimalsHex)),
        name: name || symbol || "Token",
      };
    } catch {
      return { type: "erc20", contract, symbol: "TOKEN", decimals: 18 };
    }
  }

  async getTransferEvents(hash: string): Promise<TransferEvidence[]> {
    if (!this.rpcUrl) return this.mock.getTransferEvents(hash);
    const receipt = await this.getReceipt(hash);
    if (!receipt) return [];
    const out: TransferEvidence[] = [];
    receipt.logs.forEach((l, i) => {
      const topic0 = l.topics?.[0]?.toLowerCase();
      if (topic0 === TRANSFER_TOPIC && l.topics.length >= 3) {
        const tokenId = l.topics.length >= 4 ? hexToBigInt(l.topics[3]).toString() : undefined;
        out.push({
          from: topicAddress(l.topics[1]!),
          to: topicAddress(l.topics[2]!),
          amount: tokenId ? "1" : hexToBigInt(l.data).toString(),
          asset: l.address.toLowerCase(),
          logIndex: i,
          tokenId,
        });
        return;
      }
      if (topic0 === TRANSFER_SINGLE && l.topics.length >= 4) {
        const data = (l.data ?? "0x").replace(/^0x/, "").padStart(128, "0");
        out.push({
          from: topicAddress(l.topics[2]!),
          to: topicAddress(l.topics[3]!),
          amount: hexToBigInt(`0x${data.slice(64, 128)}`).toString(),
          asset: l.address.toLowerCase(),
          logIndex: i,
          tokenId: hexToBigInt(`0x${data.slice(0, 64)}`).toString(),
        });
      }
    });
    return out;
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
    const tokenTransfers = await this.getTransferEvents(hash);
    const nativeValue = BigInt(tx.value || "0");
    const nativeMatch = Boolean(tx.to && tx.to.toLowerCase() === recipient.toLowerCase() && nativeValue > 0n);
    const transfers: TransferEvidence[] = [...tokenTransfers];
    if (nativeMatch) {
      transfers.unshift({
        from: tx.from,
        to: tx.to as string,
        amount: nativeValue.toString(),
        asset: "native",
        logIndex: -1,
      });
    }
    const wantNative = isNativeHint(assetHint);
    const wantContract = isAddress(assetHint) ? assetHint!.toLowerCase() : undefined;
    const matched =
      transfers.find((t) => {
        if (t.to.toLowerCase() !== recipient.toLowerCase()) return false;
        if (wantNative) return t.asset === "native";
        if (wantContract) return t.asset === wantContract;
        return true;
      }) ?? transfers.find((t) => t.to.toLowerCase() === recipient.toLowerCase());

    let asset: AssetEvidence;
    if (matched?.asset === "native" || (wantNative && !matched)) {
      asset = { type: "native", symbol: this.nativeSymbol, decimals: 18, name: this.nativeSymbol };
    } else if (matched?.asset && matched.asset !== "native") {
      asset = await this.getTokenMetadata(matched.asset);
      if (matched.tokenId && asset.type === "erc20") {
        asset = { type: "erc721", contract: matched.asset, symbol: asset.symbol, decimals: 0, name: asset.name };
      }
    } else if (wantContract) {
      asset = await this.getTokenMetadata(wantContract);
    } else {
      asset = { type: "native", symbol: this.nativeSymbol, decimals: 18, name: this.nativeSymbol };
    }

    const finality = await this.getFinalityState(tx.blockNumber ?? 0);
    const block = tx.blockNumber ?? 0;
    const assetKey = asset.contract ?? "native";
    const tokenId = matched?.tokenId;
    const empty = { address: recipient, asset: assetKey, balance: "0", blockNumber: 0 };
    const [balanceBefore, balanceAfter] = await Promise.all([
      block > 0 ? this.getBalance(recipient, assetKey, block - 1, tokenId) : Promise.resolve(empty),
      block > 0 ? this.getBalance(recipient, assetKey, block, tokenId) : Promise.resolve({ ...empty, blockNumber: block }),
    ]);
    return { transaction: tx, receipt, transfers, asset, balanceBefore, balanceAfter, finality };
  }

  private async callString(contract: string, selector: string): Promise<string> {
    try {
      const hex = await rpc<string>(this.requireRpc(), "eth_call", [{ to: contract, data: selector }, "latest"]);
      return decodeAbiString(hex);
    } catch {
      return "";
    }
  }

  private async supportsInterface(contract: string): Promise<"erc721" | "erc1155" | undefined> {
    try {
      const [nft, multi] = await Promise.all([
        rpc<string>(this.requireRpc(), "eth_call", [
          { to: contract, data: `0x01ffc9a7${ERC721.slice(2).padEnd(64, "0")}` },
          "latest",
        ]),
        rpc<string>(this.requireRpc(), "eth_call", [
          { to: contract, data: `0x01ffc9a7${ERC1155.slice(2).padEnd(64, "0")}` },
          "latest",
        ]),
      ]);
      if (hexToBigInt(multi) === 1n) return "erc1155";
      if (hexToBigInt(nft) === 1n) return "erc721";
    } catch {
      return undefined;
    }
    return undefined;
  }
}

export class EthereumAdapter extends EvmAdapter {
  constructor(network = "sepolia", rpcUrl?: string, requiredConfirmations = 12) {
    super("ethereum", network, rpcUrl, requiredConfirmations);
  }

  get isMock(): boolean {
    return !this.isLive;
  }
}
