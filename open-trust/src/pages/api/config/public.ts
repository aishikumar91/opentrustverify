import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminSettingsFlags } from "../../../lib/settings";
import { resolveWalletConnectProjectId } from "../../../lib/adminSettingsStore";

/**
 * Public runtime config for the admin UI.
 * WalletConnect project id: database first, then env — so Admin UI changes
 * apply without rebuilding the Next image (NEXT_PUBLIC_* alone is build-time).
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const wc = await resolveWalletConnectProjectId();
  const settings = await getAdminSettingsFlags();

  const sectoolClientId = (
    process.env.WEB3AUTH_CLIENT_ID ||
    process.env.VITE_WEB3AUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ||
    "BFQnBp6tI9LtWdhNGIkBum0O2pDUefxYnQboLBIxnWV1oaAEZOJknjf6zQK5OEdai8sv9BMZR78Bx-Gk1UBwO2M"
  ).trim();
  const sectoolNetwork = (
    process.env.WEB3AUTH_NETWORK ||
    process.env.VITE_WEB3AUTH_NETWORK ||
    "sapphire_mainnet"
  ).trim();

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    walletConnectProjectId: wc.projectId,
    walletConnectConfigured: wc.configured,
    walletConnectSource: wc.source,
    chainId: settings.chainId,
    chainName: settings.chainName,
    productName: "3GGA",
    rpc: settings.rpc,
    mainnet: settings.mainnet,
    allowlist: settings.allowlist,
    rpcSource: settings.rpcSource,
    turnstileSiteKey: (process.env.TURNSTILE_SITE_KEY ?? "").trim(),
    /** MetaMask Embedded Wallets (sectool) — public client id only. */
    sectool: {
      projectName: "sectool",
      clientId: sectoolClientId,
      network: sectoolNetwork === "sapphire_devnet" ? "sapphire_devnet" : "sapphire_mainnet",
      configured: Boolean(sectoolClientId),
    },
  });
}
