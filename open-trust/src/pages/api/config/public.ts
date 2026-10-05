import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Public runtime config for the admin UI.
 * WalletConnect project id is read at request time so VPS .env changes
 * apply without rebuilding the Next image (NEXT_PUBLIC_* alone is build-time).
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const walletConnectProjectId = (
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    process.env.WALLETCONNECT_PROJECT_ID ||
    process.env.VITE_WALLETCONNECT_PROJECT_ID ||
    ""
  ).trim();

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    walletConnectProjectId,
    walletConnectConfigured: Boolean(walletConnectProjectId),
    chainId: Number(process.env.CHAIN_ID ?? 8453),
    chainName: process.env.CHAIN_NAME ?? "Base",
  });
}
