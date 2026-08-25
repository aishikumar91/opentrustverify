import { describe, expect, it } from "vitest";
import { MockChainAdapter } from "./mock.js";

describe("MockChainAdapter", () => {
  it("normalizes demo transfer", async () => {
    const adapter = new MockChainAdapter();
    const hash = "0xdemo000000000000000000000000000000000000000000000000000000000001";
    const recipient = "0x2222222222222222222222222222222222222222";
    const evidence = await adapter.normalizeEvidence(hash, recipient);
    expect(evidence.receipt?.status).toBe("success");
    expect(evidence.transfers[0]?.to.toLowerCase()).toBe(recipient.toLowerCase());
    expect(evidence.finality.state).toBe("FINAL");
  });
});
