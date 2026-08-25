import { createAdapter } from "@otv/chain-adapters";
import { generateKeyPair, InMemoryKeyStore, verifyPayload } from "@otv/crypto-signatures";
import { verifyIncomingTransfer } from "@otv/verification-engine";

const store = new InMemoryKeyStore();
store.put(generateKeyPair("otv-demo"));
const adapter = createAdapter("mock", "local");
const verdict = await verifyIncomingTransfer(
  {
    chain: "ethereum",
    network: "sepolia",
    transactionHash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
    recipient: "0x2222222222222222222222222222222222222222",
    asset: {
      type: "erc20",
      contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      symbol: "USDC",
    },
    expectedAmount: "1000000",
  },
  { adapter, keyStore: store, maxConfidence: 0.95 }
);

const ok = verifyPayload(verdict, verdict.signature!, store.getPublic(verdict.kid)!);
console.log(JSON.stringify({ status: verdict.status, confidence: verdict.confidence, signatureValid: ok, verdictId: verdict.verdictId }, null, 2));
if (verdict.status !== "SPENDABLE" || !ok) process.exit(1);
