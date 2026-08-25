import { describe, expect, it } from "vitest";
import {
  generateKeyPair,
  signPayload,
  verifyPayload,
  canonicalSerialize,
} from "./index.js";

describe("signed verdicts", () => {
  it("signs and verifies", () => {
    const kp = generateKeyPair("otv-dev-1");
    const payload = { schema: "otv.verdict.v1", verdictId: "vr_1", status: "SPENDABLE" };
    const sig = signPayload(payload, kp.privateKeyHex);
    expect(verifyPayload(payload, sig, kp.publicKeyHex)).toBe(true);
  });

  it("fails on tamper", () => {
    const kp = generateKeyPair("otv-dev-1");
    const payload = { a: 1, b: 2 };
    const sig = signPayload(payload, kp.privateKeyHex);
    expect(verifyPayload({ a: 1, b: 3 }, sig, kp.publicKeyHex)).toBe(false);
  });

  it("canonicalizes key order", () => {
    expect(canonicalSerialize({ b: 1, a: 2 })).toBe(canonicalSerialize({ a: 2, b: 1 }));
  });
});
