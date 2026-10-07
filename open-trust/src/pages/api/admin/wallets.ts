import type { NextApiRequest, NextApiResponse } from "next";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "../../../lib/auth";
import {
  listLinkedWallets,
  upsertLinkedWallet,
  removeLinkedWallet,
  toLinkedWalletPublic,
  type LinkedWalletSource,
} from "../../../lib/linkedWalletsStore";

const SOURCES = new Set<LinkedWalletSource>([
  "injected",
  "walletconnect",
  "passkey",
  "manual",
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (!session) {
    return res.status(401).json({ error: "Admin session required." });
  }

  try {
    if (req.method === "GET") {
      const rows = await listLinkedWallets(session.username);
      return res.status(200).json({
        wallets: rows.map(toLinkedWalletPublic),
      });
    }

    if (req.method === "POST") {
      const { address, source, label } = req.body as {
        address?: string;
        source?: string;
        label?: string;
      };
      if (!address || typeof address !== "string") {
        return res.status(400).json({ error: "address is required" });
      }
      const src = (source ?? "manual") as LinkedWalletSource;
      if (!SOURCES.has(src)) {
        return res.status(400).json({ error: "Invalid source" });
      }
      const row = await upsertLinkedWallet({
        adminUsername: session.username,
        address,
        source: src,
        label: label ?? null,
      });
      return res.status(200).json({ wallet: toLinkedWalletPublic(row) });
    }

    if (req.method === "DELETE") {
      const { address } = req.body as { address?: string };
      if (!address) {
        return res.status(400).json({ error: "address is required" });
      }
      const removed = await removeLinkedWallet(session.username, address);
      return res.status(200).json({ removed });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet link failed";
    return res.status(400).json({ error: message });
  }
}
