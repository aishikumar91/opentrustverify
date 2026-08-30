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

const BTC: AssetEvidence = { type: "native", symbol: "BTC", decimals: 8, name: "Bitcoin" };

const DEMO_TX = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DEMO_TO = "tb1qdemo000000000000000000000000000000000";

type EsploraTx = {
  txid: string;
  status: { confirmed: boolean; block_height?: number; block_hash?: string; block_time?: number };
  vin: Array<{ prevout?: { scriptpubkey_address?: string; value?: number } }>;
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
};

function esploraBase(network: string, override?: string): string | undefined {
  if (override === "0" || override === "off") return undefined;
  if (override) return override.replace(/\/$/, "");
  if (process.env.BTC_ESPLORA_URL === "0" || process.env.BTC_ESPLORA_URL === "off") return undefined;
  if (process.env.BTC_ESPLORA_URL) return process.env.BTC_ESPLORA_URL.replace(/\/$/, "");
  const n = network.toLowerCase();
  if (n === "mock" || n === "local") return undefined;
  if (n === "testnet") return "https://blockstream.info/testnet/api";
  if (n === "signet") return "https://mempool.space/signet/api";
  return "https://blockstream.info/api";
}

function requiredConfs(network: string): number {
  const n = network.toLowerCase();
  if (n === "testnet" || n === "signet") return 3;
  return 6;
}

async function esplora<T>(base: string, path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15_000) });
  if (res.status === 404) throw Object.assign(new Error("not_found"), { status: 404 });
  if (!res.ok) throw new Error(`Esplora HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function btcAddressesMatch(a: string, b: string): boolean {
  if (/^(bc1|tb1|bcrt1)/i.test(a) || /^(bc1|tb1|bcrt1)/i.test(b)) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

export class BitcoinAdapter implements ChainAdapter {
  readonly chainId = "bitcoin";
  readonly network: string;
  readonly isLive: boolean;
  private readonly base: string | undefined;
  private readonly required: number;

  constructor(network = "mainnet", esploraUrl?: string) {
    this.network = network;
    this.base = esploraBase(network, esploraUrl);
    this.isLive = Boolean(this.base);
    this.required = requiredConfs(network);
  }

  async getTransaction(hash: string): Promise<TransactionEvidence> {
    if (!this.base) return this.mockTx(hash);
    try {
      const tx = await esplora<EsploraTx>(this.base, `/tx/${hash}`);
      const to = tx.vout.find((o) => o.scriptpubkey_address)?.scriptpubkey_address ?? null;
      const from = tx.vin[0]?.prevout?.scriptpubkey_address ?? "";
      const value = tx.vout.reduce((s, o) => s + o.value, 0);
      return {
        hash: tx.txid,
        from,
        to,
        blockNumber: tx.status.block_height ?? null,
        status: tx.status.confirmed ? "included" : "pending",
        value: String(value),
      };
    } catch (err) {
      if ((err as { status?: number }).status === 404) {
        return { hash, from: "", to: null, blockNumber: null, status: "unknown", value: "0" };
      }
      throw err;
    }
  }

  async getReceipt(hash: string): Promise<ReceiptEvidence | null> {
    if (!this.base) return this.mockReceipt(hash);
    const tx = await this.getTransaction(hash);
    if (tx.status === "unknown") return null;
    if (tx.status === "pending") return null;
    return {
      hash,
      status: "success",
      blockNumber: tx.blockNumber ?? 0,
      gasUsed: "0",
      logs: [],
    };
  }

  async getBlock(number: number): Promise<BlockEvidence> {
    if (!this.base) return { number, hash: `btc-block-${number}`, timestamp: Math.floor(Date.now() / 1000) };
    const hash = await fetch(`${this.base}/block-height/${number}`, { signal: AbortSignal.timeout(15_000) }).then(
      (r) => r.text()
    );
    return { number, hash: hash.trim(), timestamp: Math.floor(Date.now() / 1000) };
  }

  async getBalance(address: string, asset: string, block = 0): Promise<BalanceEvidence> {
    if (!this.base) {
      const known = this.mockKnown(address);
      return { address, asset: "native", balance: known ? "100000" : "0", blockNumber: block };
    }
    const stats = await esplora<{ chain_stats: { funded_txo_sum: number; spent_txo_sum: number } }>(
      this.base,
      `/address/${address}`
    );
    const balance = String(stats.chain_stats.funded_txo_sum - stats.chain_stats.spent_txo_sum);
    return { address, asset: "native", balance, blockNumber: block };
  }

  async getTokenMetadata(_contract: string): Promise<AssetEvidence> {
    return BTC;
  }

  async getTransferEvents(hash: string): Promise<TransferEvidence[]> {
    if (!this.base) return this.mockTransfers(hash);
    try {
      const tx = await esplora<EsploraTx>(this.base, `/tx/${hash}`);
      const from = tx.vin[0]?.prevout?.scriptpubkey_address ?? "";
      return tx.vout
        .filter((o) => o.scriptpubkey_address)
        .map((o, i) => ({
          from,
          to: o.scriptpubkey_address as string,
          amount: String(o.value),
          asset: "native",
          logIndex: i,
        }));
    } catch (err) {
      if ((err as { status?: number }).status === 404) return [];
      throw err;
    }
  }

  async getFinalityState(blockNumber: number): Promise<FinalityEvidence> {
    if (!this.base) {
      return { state: "FINAL", confirmations: 8, required: this.required, headBlock: blockNumber + 8 };
    }
    const head = Number(await fetch(`${this.base}/blocks/tip/height`, { signal: AbortSignal.timeout(15_000) }).then((r) => r.text()));
    const confirmations = blockNumber > 0 ? Math.max(0, head - blockNumber + 1) : 0;
    return {
      state: confirmations >= this.required ? "FINAL" : "PENDING",
      confirmations,
      required: this.required,
      headBlock: head,
    };
  }

  async normalizeEvidence(hash: string, recipient: string): Promise<NormalizedEvidence> {
    const tx = await this.getTransaction(hash);
    const receipt = await this.getReceipt(hash);
    const transfers = await this.getTransferEvents(hash);
    const matched = transfers.find((t) => btcAddressesMatch(t.to, recipient));
    const amount = matched?.amount ?? "0";
    const finality = await this.getFinalityState(tx.blockNumber ?? 0);
    let balanceAfter = amount;
    let balanceBefore = "0";
    if (this.base && matched) {
      try {
        const current = await this.getBalance(recipient, "native", tx.blockNumber ?? 0);
        balanceAfter = current.balance;
        const afterN = BigInt(current.balance);
        const amt = BigInt(amount);
        balanceBefore = afterN >= amt ? String(afterN - amt) : "0";
      } catch {
        balanceAfter = amount;
      }
    } else if (matched) {
      balanceAfter = amount;
    }
    return {
      transaction: tx,
      receipt,
      transfers,
      asset: BTC,
      balanceBefore: {
        address: recipient,
        asset: "native",
        balance: balanceBefore,
        blockNumber: Math.max(0, (tx.blockNumber ?? 1) - 1),
      },
      balanceAfter: {
        address: recipient,
        asset: "native",
        balance: balanceAfter,
        blockNumber: tx.blockNumber ?? 0,
      },
      finality,
    };
  }

  private mockKnown(address: string): boolean {
    return btcAddressesMatch(address, DEMO_TO);
  }

  private mockTx(hash: string): TransactionEvidence {
    const known = hash.toLowerCase() === DEMO_TX;
    return {
      hash,
      from: "tb1qfrom000000000000000000000000000000000",
      to: DEMO_TO,
      blockNumber: known ? 200 : null,
      status: known ? "included" : "unknown",
      value: known ? "100000" : "0",
    };
  }

  private mockReceipt(hash: string): ReceiptEvidence | null {
    if (hash.toLowerCase() !== DEMO_TX) return null;
    return { hash, status: "success", blockNumber: 200, gasUsed: "0", logs: [] };
  }

  private mockTransfers(hash: string): TransferEvidence[] {
    if (hash.toLowerCase() !== DEMO_TX) return [];
    return [
      {
        from: "tb1qfrom000000000000000000000000000000000",
        to: DEMO_TO,
        amount: "100000",
        asset: "native",
        logIndex: 0,
      },
    ];
  }
}

export const BITCOIN_DEMO = { hash: DEMO_TX, recipient: DEMO_TO, amount: "100000" };
