export type ChainFamily = "evm" | "bitcoin" | "solana" | "tron";

export type NetworkDef = {
  id: string;
  confirmations: number;
  publicRpc?: string;
};

export type ChainDef = {
  id: string;
  name: string;
  family: ChainFamily;
  nativeSymbol: string;
  nativeDecimals: number;
  rpcEnv: string;
  networks: NetworkDef[];
};

export type KnownAsset = {
  chain: string;
  network: string;
  type: "native" | "erc20" | "erc721" | "erc1155" | "other";
  symbol: string;
  decimals: number;
  contract?: string;
  name?: string;
};

function evm(
  id: string,
  name: string,
  symbol: string,
  rpcEnv: string,
  networks: NetworkDef[]
): ChainDef {
  return { id, name, family: "evm", nativeSymbol: symbol, nativeDecimals: 18, rpcEnv, networks };
}

/** Supported verification targets. Any ERC-20/721/1155 on an EVM network works even if it is not listed. */
export const CHAINS: ChainDef[] = [
  evm("ethereum", "Ethereum", "ETH", "ETH_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://ethereum.publicnode.com" },
    { id: "sepolia", confirmations: 12, publicRpc: "https://ethereum-sepolia.publicnode.com" },
  ]),
  evm("polygon", "Polygon", "POL", "POLYGON_RPC_URL", [
    { id: "mainnet", confirmations: 30, publicRpc: "https://polygon-bor-rpc.publicnode.com" },
    { id: "amoy", confirmations: 16, publicRpc: "https://rpc-amoy.polygon.technology" },
  ]),
  evm("arbitrum", "Arbitrum One", "ETH", "ARBITRUM_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://arbitrum-one.publicnode.com" },
    { id: "sepolia", confirmations: 12, publicRpc: "https://sepolia-rollup.arbitrum.io/rpc" },
  ]),
  evm("optimism", "Optimism", "ETH", "OPTIMISM_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://optimism.publicnode.com" },
    { id: "sepolia", confirmations: 12, publicRpc: "https://sepolia.optimism.io" },
  ]),
  evm("base", "Base", "ETH", "BASE_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://base.publicnode.com" },
    { id: "sepolia", confirmations: 12, publicRpc: "https://sepolia.base.org" },
  ]),
  evm("bnb", "BNB Smart Chain", "BNB", "BNB_RPC_URL", [
    { id: "mainnet", confirmations: 15, publicRpc: "https://bsc.publicnode.com" },
    { id: "testnet", confirmations: 8, publicRpc: "https://bsc-testnet.publicnode.com" },
  ]),
  evm("avalanche", "Avalanche C-Chain", "AVAX", "AVALANCHE_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://avalanche-c-chain-rpc.publicnode.com" },
    { id: "fuji", confirmations: 8, publicRpc: "https://api.avax-test.network/ext/bc/C/rpc" },
  ]),
  evm("gnosis", "Gnosis", "XDAI", "GNOSIS_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://gnosis.publicnode.com" },
  ]),
  evm("linea", "Linea", "ETH", "LINEA_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://rpc.linea.build" },
  ]),
  evm("scroll", "Scroll", "ETH", "SCROLL_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://rpc.scroll.io" },
  ]),
  evm("blast", "Blast", "ETH", "BLAST_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://rpc.blast.io" },
  ]),
  evm("zksync", "ZKsync Era", "ETH", "ZKSYNC_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://mainnet.era.zksync.io" },
  ]),
  evm("mantle", "Mantle", "MNT", "MANTLE_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://rpc.mantle.xyz" },
  ]),
  evm("celo", "Celo", "CELO", "CELO_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://forno.celo.org" },
  ]),
  evm("moonbeam", "Moonbeam", "GLMR", "MOONBEAM_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://moonbeam.public.blastapi.io" },
  ]),
  evm("fantom", "Fantom", "FTM", "FANTOM_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://rpcapi.fantom.network" },
  ]),
  evm("cronos", "Cronos", "CRO", "CRONOS_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://evm.cronos.org" },
  ]),
  evm("aurora", "Aurora", "ETH", "AURORA_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://mainnet.aurora.dev" },
  ]),
  evm("metis", "Metis", "METIS", "METIS_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://andromeda.metis.io/?owner=1088" },
  ]),
  evm("polygon-zkevm", "Polygon zkEVM", "ETH", "POLYGON_ZKEVM_RPC_URL", [
    { id: "mainnet", confirmations: 20, publicRpc: "https://zkevm-rpc.com" },
  ]),
  evm("unichain", "Unichain", "ETH", "UNICHAIN_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://mainnet.unichain.org" },
  ]),
  evm("worldchain", "World Chain", "ETH", "WORLDCHAIN_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://worldchain-mainnet.g.alchemy.com/public" },
  ]),
  evm("mode", "Mode", "ETH", "MODE_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://mainnet.mode.network" },
  ]),
  evm("taiko", "Taiko", "ETH", "TAIKO_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://rpc.mainnet.taiko.xyz" },
  ]),
  evm("sonic", "Sonic", "S", "SONIC_RPC_URL", [
    { id: "mainnet", confirmations: 12, publicRpc: "https://rpc.soniclabs.com" },
  ]),
  {
    id: "bitcoin",
    name: "Bitcoin",
    family: "bitcoin",
    nativeSymbol: "BTC",
    nativeDecimals: 8,
    rpcEnv: "BTC_ESPLORA_URL",
    networks: [
      { id: "mainnet", confirmations: 6 },
      { id: "testnet", confirmations: 3 },
      { id: "signet", confirmations: 3 },
      { id: "mock", confirmations: 6 },
    ],
  },
  {
    id: "solana",
    name: "Solana",
    family: "solana",
    nativeSymbol: "SOL",
    nativeDecimals: 9,
    rpcEnv: "SOLANA_RPC_URL",
    networks: [
      { id: "mainnet", confirmations: 32, publicRpc: "https://api.mainnet-beta.solana.com" },
      { id: "devnet", confirmations: 16, publicRpc: "https://api.devnet.solana.com" },
      { id: "mock", confirmations: 32 },
    ],
  },
  {
    id: "tron",
    name: "Tron",
    family: "tron",
    nativeSymbol: "TRX",
    nativeDecimals: 6,
    rpcEnv: "TRON_API_URL",
    networks: [
      { id: "mainnet", confirmations: 19, publicRpc: "https://api.trongrid.io" },
      { id: "nile", confirmations: 12, publicRpc: "https://nile.trongrid.io" },
      { id: "mock", confirmations: 19 },
    ],
  },
  evm("mock", "Mock", "ETH", "ETH_RPC_URL", [{ id: "local", confirmations: 12 }]),
];

const ALIASES: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  matic: "polygon",
  arb: "arbitrum",
  op: "optimism",
  bsc: "bnb",
  avax: "avalanche",
  sol: "solana",
  trx: "tron",
};

export function resolveChainId(chain: string): string {
  const id = chain.toLowerCase();
  return ALIASES[id] ?? id;
}

export function getChain(chain: string): ChainDef | undefined {
  const id = resolveChainId(chain);
  return CHAINS.find((c) => c.id === id);
}

export function getNetwork(chain: string, network: string): NetworkDef | undefined {
  const def = getChain(chain);
  if (!def) return undefined;
  const id = network.toLowerCase();
  return def.networks.find((n) => n.id === id);
}

export function allowPublicRpc(): boolean {
  const flag = (process.env.EVM_PUBLIC_RPC ?? "").toLowerCase();
  if (flag === "0" || flag === "off") return false;
  if (flag === "1" || flag === "on") return true;
  if (process.env.VITEST) return false;
  return true;
}

export function resolveRpcUrl(chain: string, network: string, override?: string): string | undefined {
  if (override === "0" || override === "off") return undefined;
  if (override) return override;
  const n = network.toLowerCase();
  if (n === "mock" || n === "local") return undefined;
  const def = getChain(chain);
  if (!def) return undefined;
  if (def.id === "mock") return undefined;
  const envVal = process.env[def.rpcEnv];
  if (envVal === "0" || envVal === "off") return undefined;
  if (envVal) return envVal.replace(/\/$/, "");
  const generic = process.env.EVM_RPC_URL;
  if (def.family === "evm" && generic && generic !== "0" && generic !== "off") {
    return generic.replace(/\/$/, "");
  }
  if (!allowPublicRpc()) return undefined;
  return getNetwork(def.id, network)?.publicRpc;
}

export function catalogChains(): Array<{
  id: string;
  name: string;
  family: ChainFamily;
  nativeSymbol: string;
  networks: string[];
  adapter: ChainFamily | "mock";
}> {
  return CHAINS.map((c) => ({
    id: c.id,
    name: c.name,
    family: c.family,
    nativeSymbol: c.nativeSymbol,
    networks: c.networks.map((n) => n.id),
    adapter: c.id === "mock" ? "mock" : c.family,
  }));
}

export function catalogNetworks(chain?: string): Array<{
  chain: string;
  id: string;
  finalityConfirmations: number;
  liveDefault: boolean;
}> {
  const list = chain ? CHAINS.filter((c) => c.id === resolveChainId(chain)) : CHAINS;
  return list.flatMap((c) =>
    c.networks.map((n) => ({
      chain: c.id,
      id: n.id,
      finalityConfirmations: n.confirmations,
      liveDefault: Boolean(resolveRpcUrl(c.id, n.id)) || (c.family === "bitcoin" && n.id !== "mock"),
    }))
  );
}
