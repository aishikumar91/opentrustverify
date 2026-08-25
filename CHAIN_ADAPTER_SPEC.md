# Chain Adapter Specification

All RPC must go through `ChainAdapter` (`@otv/chain-adapters`). Business logic never calls RPC directly.

## Interface

```ts
interface ChainAdapter {
  getTransaction(hash: string): Promise<TransactionEvidence>;
  getReceipt(hash: string): Promise<ReceiptEvidence | null>;
  getBlock(number: number): Promise<BlockEvidence>;
  getBalance(address: string, asset: string, block?: number): Promise<BalanceEvidence>;
  getTokenMetadata(contract: string): Promise<AssetEvidence>;
  getTransferEvents(hash: string): Promise<TransferEvidence[]>;
  getFinalityState(blockNumber: number): Promise<FinalityEvidence>;
  normalizeEvidence(hash: string, recipient: string, assetHint?: string): Promise<NormalizedEvidence>;
}
```

## Ethereum

- `ETH_RPC_URL` unset → `MockChainAdapter`
- `ETH_RPC_URL` set → live JSON-RPC (`eth_getTransactionByHash`, receipt, logs, `balanceOf`, block number)

Adapters must be independently testable.
