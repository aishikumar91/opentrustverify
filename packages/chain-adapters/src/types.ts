export interface TransactionEvidence {
  hash: string;
  from: string;
  to: string | null;
  blockNumber: number | null;
  status: "pending" | "included" | "unknown";
  value: string;
  input?: string;
}

export interface ReceiptEvidence {
  hash: string;
  status: "success" | "reverted" | "unknown";
  blockNumber: number;
  gasUsed: string;
  logs: Array<{ address: string; topics: string[]; data: string }>;
}

export interface BlockEvidence {
  number: number;
  hash: string;
  timestamp: number;
}

export interface BalanceEvidence {
  address: string;
  asset: string;
  balance: string;
  blockNumber: number;
}

export interface AssetEvidence {
  type: "native" | "erc20" | "erc721" | "erc1155" | "other";
  contract?: string;
  symbol?: string;
  decimals?: number;
  name?: string;
}

export interface TransferEvidence {
  from: string;
  to: string;
  amount: string;
  asset: string;
  logIndex: number;
}

export interface FinalityEvidence {
  state: "PENDING" | "SAFE" | "FINAL" | "UNKNOWN";
  confirmations: number;
  required: number;
  headBlock: number;
}

export interface NormalizedEvidence {
  transaction: TransactionEvidence;
  receipt: ReceiptEvidence | null;
  transfers: TransferEvidence[];
  asset: AssetEvidence | null;
  balanceBefore: BalanceEvidence | null;
  balanceAfter: BalanceEvidence | null;
  finality: FinalityEvidence;
}

export interface ChainAdapter {
  readonly chainId: string;
  readonly network: string;
  getTransaction(hash: string): Promise<TransactionEvidence>;
  getReceipt(hash: string): Promise<ReceiptEvidence | null>;
  getBlock(number: number): Promise<BlockEvidence>;
  getBalance(address: string, asset: string, block?: number): Promise<BalanceEvidence>;
  getTokenMetadata(contract: string): Promise<AssetEvidence>;
  getTransferEvents(hash: string): Promise<TransferEvidence[]>;
  getFinalityState(blockNumber: number): Promise<FinalityEvidence>;
  normalizeEvidence(hash: string, recipient: string, assetHint?: string): Promise<NormalizedEvidence>;
}
