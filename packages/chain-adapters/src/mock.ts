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

export interface MockScenario {
  hash: string;
  from: string;
  to: string;
  amount: string;
  assetContract: string;
  symbol: string;
  decimals: number;
  success?: boolean;
  confirmations?: number;
  requiredConfirmations?: number;
  balanceDelta?: string;
}

const DEFAULT: MockScenario = {
  hash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
  from: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  amount: "1000000",
  assetContract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  symbol: "USDC",
  decimals: 6,
  success: true,
  confirmations: 20,
  requiredConfirmations: 12,
  balanceDelta: "1000000",
};

export class MockChainAdapter implements ChainAdapter {
  readonly chainId = "ethereum";
  readonly network: string;
  private scenarios = new Map<string, MockScenario>();

  constructor(network = "sepolia") {
    this.network = network;
    this.register(DEFAULT);
  }

  register(scenario: MockScenario): void {
    this.scenarios.set(scenario.hash.toLowerCase(), scenario);
  }

  private get(hash: string): MockScenario {
    return this.scenarios.get(hash.toLowerCase()) ?? {
      ...DEFAULT,
      hash,
      success: false,
      confirmations: 0,
    };
  }

  async getTransaction(hash: string): Promise<TransactionEvidence> {
    const s = this.get(hash);
    const known = this.scenarios.has(hash.toLowerCase());
    return {
      hash: s.hash,
      from: s.from,
      to: s.assetContract,
      blockNumber: known ? 100 : null,
      status: known ? "included" : "unknown",
      value: "0",
    };
  }

  async getReceipt(hash: string): Promise<ReceiptEvidence | null> {
    const s = this.get(hash);
    if (!this.scenarios.has(hash.toLowerCase())) return null;
    return {
      hash: s.hash,
      status: s.success === false ? "reverted" : "success",
      blockNumber: 100,
      gasUsed: "65000",
      logs: [],
    };
  }

  async getBlock(number: number): Promise<BlockEvidence> {
    return { number, hash: `0xblock${number}`, timestamp: Math.floor(Date.now() / 1000) };
  }

  async getBalance(address: string, asset: string, block = 100): Promise<BalanceEvidence> {
    const delta = [...this.scenarios.values()].find((s) => s.to.toLowerCase() === address.toLowerCase());
    const bal = block >= 100 && delta ? delta.balanceDelta ?? delta.amount : "0";
    return { address, asset, balance: bal, blockNumber: block };
  }

  async getTokenMetadata(contract: string): Promise<AssetEvidence> {
    const s = [...this.scenarios.values()].find(
      (x) => x.assetContract.toLowerCase() === contract.toLowerCase()
    );
    return {
      type: "erc20",
      contract,
      symbol: s?.symbol ?? "TOKEN",
      decimals: s?.decimals ?? 18,
      name: s?.symbol ?? "Token",
    };
  }

  async getTransferEvents(hash: string): Promise<TransferEvidence[]> {
    const s = this.get(hash);
    if (!this.scenarios.has(hash.toLowerCase()) || s.success === false) return [];
    return [
      {
        from: s.from,
        to: s.to,
        amount: s.amount,
        asset: s.assetContract,
        logIndex: 0,
      },
    ];
  }

  async getFinalityState(blockNumber: number): Promise<FinalityEvidence> {
    const required = 12;
    const head = blockNumber + 20;
    const confirmations = head - blockNumber;
    return {
      state: confirmations >= required ? "FINAL" : "PENDING",
      confirmations,
      required,
      headBlock: head,
    };
  }

  async normalizeEvidence(
    hash: string,
    recipient: string,
    assetHint?: string
  ): Promise<NormalizedEvidence> {
    const tx = await this.getTransaction(hash);
    const receipt = await this.getReceipt(hash);
    const transfers = await this.getTransferEvents(hash);
    const s = this.get(hash);
    const asset = await this.getTokenMetadata(assetHint ?? s.assetContract);
    const finality = await this.getFinalityState(tx.blockNumber ?? 0);
    const matched = transfers.find((t) => t.to.toLowerCase() === recipient.toLowerCase());
    return {
      transaction: tx,
      receipt,
      transfers,
      asset,
      balanceBefore: {
        address: recipient,
        asset: asset.contract ?? "native",
        balance: "0",
        blockNumber: (tx.blockNumber ?? 1) - 1,
      },
      balanceAfter: {
        address: recipient,
        asset: asset.contract ?? "native",
        balance: matched?.amount ?? "0",
        blockNumber: tx.blockNumber ?? 0,
      },
      finality,
    };
  }
}
