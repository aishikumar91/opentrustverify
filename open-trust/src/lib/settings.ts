/**
 * Runtime admin settings flags (YES/NO). Values come from the process env
 * after docker-entrypoint mapping — the UI must not invent them.
 */

export type YesNo = "YES" | "NO";

export interface AdminSettingsFlags {
  rpc: YesNo;
  mainnet: YesNo;
  allowlist: YesNo;
  chainId: number;
  chainName: string;
  /** Non-secret detail for the settings panel (no URLs / keys). */
  rpcSource: "RPC_URL" | "BASE_RPC_URL" | "ETH_RPC_URL" | "EVM_RPC_URL" | null;
}

function isConfigured(value: string | undefined | null): boolean {
  return Boolean(value && value.trim());
}

/** Resolve which env supplies RPC after entrypoint-style mapping. */
export function resolveRpcSource(): AdminSettingsFlags["rpcSource"] {
  if (isConfigured(process.env.RPC_URL)) return "RPC_URL";
  if (isConfigured(process.env.BASE_RPC_URL)) return "BASE_RPC_URL";
  if (isConfigured(process.env.ETH_RPC_URL)) return "ETH_RPC_URL";
  if (isConfigured(process.env.EVM_RPC_URL)) return "EVM_RPC_URL";
  return null;
}

export function isRpcConfigured(): boolean {
  return resolveRpcSource() !== null;
}

export function isMainnetEnabled(): boolean {
  const allow = (process.env.ALLOW_MAINNET ?? "").trim().toLowerCase();
  if (allow === "true" || allow === "1" || allow === "yes") return true;

  const chainId = process.env.CHAIN_ID ?? "8453";
  const chainName = (process.env.CHAIN_NAME ?? "").toLowerCase();
  if (chainId === "8453" || chainId === "1") return true;
  if (chainName.includes("mainnet")) return true;
  return false;
}

export function isAllowlistConfigured(): boolean {
  const raw = process.env.ADMIN_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((a) => a.trim())
    .some(Boolean);
}

export function getAdminSettingsFlags(): AdminSettingsFlags {
  const rpcSource = resolveRpcSource();
  return {
    rpc: rpcSource ? "YES" : "NO",
    mainnet: isMainnetEnabled() ? "YES" : "NO",
    allowlist: isAllowlistConfigured() ? "YES" : "NO",
    chainId: Number(process.env.CHAIN_ID ?? 8453),
    chainName: process.env.CHAIN_NAME ?? "Base",
    rpcSource,
  };
}
