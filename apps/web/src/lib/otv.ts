import { createAdapter } from "@otv/chain-adapters";
import { generateKeyPair, InMemoryKeyStore, verifyPayload } from "@otv/crypto-signatures";
import { verifyIncomingTransfer } from "@otv/verification-engine";
import type { IncomingClaim, Verdict } from "@otv/verdict-schema";
import { OpenTrustVerify } from "@otv/sdk-core";

const DEMO_MODE =
  import.meta.env.VITE_OTV_DEMO_MODE !== "false" &&
  (!import.meta.env.VITE_OTV_API_URL || import.meta.env.VITE_OTV_DEMO_MODE === "true");

const API_BASE = import.meta.env.VITE_OTV_API_URL ?? "";
const API_KEY = import.meta.env.VITE_OTV_API_KEY ?? "otv_test_demo_key_change_me";

/** Shared browser keystore for static Vercel demos (not production signing). */
const browserKeys = new InMemoryKeyStore();
browserKeys.put(generateKeyPair("otv-web-demo-1"));

export const isDemoMode = DEMO_MODE;

export const DEMO_CLAIM: IncomingClaim = {
  chain: "ethereum",
  network: "sepolia",
  transactionHash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
  recipient: "0x2222222222222222222222222222222222222222",
  asset: {
    type: "erc20",
    contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    symbol: "USDC",
    decimals: 6,
  },
  expectedAmount: "1000000",
};

export async function verifyIncoming(claim: IncomingClaim): Promise<{
  verdict: Verdict;
  signatureValid: boolean;
  mode: "demo" | "api";
}> {
  if (DEMO_MODE || !API_BASE) {
    const adapter = createAdapter("mock", claim.network || "local");
    const verdict = await verifyIncomingTransfer(claim, {
      adapter,
      keyStore: browserKeys,
      maxConfidence: 0.95,
    });
    const pub = browserKeys.getPublic(verdict.kid)!;
    return {
      verdict,
      signatureValid: verifyPayload(verdict, verdict.signature!, pub),
      mode: "demo",
    };
  }

  const otv = new OpenTrustVerify({ baseUrl: API_BASE, apiKey: API_KEY });
  const result = await otv.verifyIncomingTransfer(claim);
  const check = await otv.verifySignature(result.verdict);
  return { verdict: result.verdict, signatureValid: check.valid, mode: "api" };
}

export async function createApiKeyDemo(): Promise<{ raw: string; prefix: string }> {
  if (DEMO_MODE || !API_BASE) {
    const raw = `otv_live_demo_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    return { raw, prefix: raw.slice(0, 12) };
  }
  const res = await fetch(`${API_BASE}/v1/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "proj_demo", name: "Dashboard key" }),
  });
  const data = await res.json();
  return { raw: data.raw, prefix: data.record?.prefix ?? "otv_live_" };
}
