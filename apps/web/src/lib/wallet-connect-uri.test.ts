import assert from "node:assert/strict";
import test from "node:test";
import { isWalletConnectUri, pairingQrDataUrl } from "./wallet-connect-uri";

const topic = "ab".repeat(32);
const symKey = "cd".repeat(32);
const uri = `wc:${topic}@2?relay-protocol=irn&symKey=${symKey}`;

test("accepts a WalletConnect v2 pairing link and rejects addresses", () => {
  assert.equal(isWalletConnectUri(uri), true);
  assert.equal(isWalletConnectUri("0x2222222222222222222222222222222222222222"), false);
  assert.equal(isWalletConnectUri("wc:short@2?relay-protocol=irn"), false);
  assert.equal(isWalletConnectUri(`wc:${topic}@1?relay-protocol=irn&symKey=${symKey}`), false);
});

test("draws a pairing QR that encodes the WalletConnect link", async () => {
  const image = await pairingQrDataUrl(uri);
  assert.match(image, /^data:image\/png;base64,/);
  const png = Buffer.from(image.slice("data:image/png;base64,".length), "base64");
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.ok(png.length > 500);
  await assert.rejects(() => pairingQrDataUrl("0x2222222222222222222222222222222222222222"));
});
