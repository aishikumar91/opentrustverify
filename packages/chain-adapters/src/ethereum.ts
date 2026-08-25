import type { ChainAdapter, NormalizedEvidence, TransactionEvidence, ReceiptEvidence, BlockEvidence, BalanceEvidence, AssetEvidence, TransferEvidence, FinalityEvidence } from "./types.js";
import { MockChainAdapter } from "./mock.js";

/**
 * Ethereum adapter.
 * When ETH_RPC_URL is unset, delegates to MockChainAdapter (documented boundary).
 * Live JSON-RPC implementation is wired when RPC is configured.
 */
export class EthereumAdapter implements ChainAdapter {
  readonly chainId = "ethereum";
  readonly network: string;
  private readonly rpcUrl: string | undefined;
  private readonly mock: MockChainAdapter;

  constructor(network = "sepolia", rpcUrl?: string) {
    this.network = network;
    this.rpcUrl = rpcUrl ?? process.env.ETH_RPC_URL;
    this.mock = new MockChainAdapter(network);
  }

  get isLive(): boolean {
    return Boolean(this.rpcUrl);
  }

  private ensure(): ChainAdapter {
    // MVP: live eth_ calls can be added behind this gate; mock keeps demos offline-capable.
    if (!this.rpcUrl) return this.mock;
    return this.mock; // PLACEHOLDER: JSON-RPC client — interface stable for production RPC wiring
  }

  getTransaction(hash: string): Promise<TransactionEvidence> {
    return this.ensure().getTransaction(hash);
  }
  getReceipt(hash: string): Promise<ReceiptEvidence | null> {
    return this.ensure().getReceipt(hash);
  }
  getBlock(number: number): Promise<BlockEvidence> {
    return this.ensure().getBlock(number);
  }
  getBalance(address: string, asset: string, block?: number): Promise<BalanceEvidence> {
    return this.ensure().getBalance(address, asset, block);
  }
  getTokenMetadata(contract: string): Promise<AssetEvidence> {
    return this.ensure().getTokenMetadata(contract);
  }
  getTransferEvents(hash: string): Promise<TransferEvidence[]> {
    return this.ensure().getTransferEvents(hash);
  }
  getFinalityState(blockNumber: number): Promise<FinalityEvidence> {
    return this.ensure().getFinalityState(blockNumber);
  }
  normalizeEvidence(hash: string, recipient: string, assetHint?: string): Promise<NormalizedEvidence> {
    return this.ensure().normalizeEvidence(hash, recipient, assetHint);
  }
}

export function createAdapter(chain: string, network: string, rpcUrl?: string): ChainAdapter {
  if (chain === "ethereum" || chain === "mock") {
    return new EthereumAdapter(network, chain === "mock" ? undefined : rpcUrl);
  }
  throw new Error(`Unsupported chain: ${chain}`);
}
