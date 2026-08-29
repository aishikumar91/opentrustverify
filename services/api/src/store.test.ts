import { describe, expect, it } from "vitest";
import { MemoryStore, DEMO_API_KEY } from "./lib/store.js";

describe("MemoryStore auth", () => {
  it("authenticates demo key", async () => {
    const s = new MemoryStore();
    await s.ready();
    expect((await s.authenticate(DEMO_API_KEY))?.id).toBe("key_demo");
    expect(await s.authenticate("bad")).toBeNull();
  });

  it("persists verdicts and usage", async () => {
    const s = new MemoryStore();
    await s.ready();
    await s.saveVerdict(
      {
        schema: "otv.verdict.v1",
        verdictId: "vr_test",
        status: "SPENDABLE",
        confidence: 0.9,
        chain: "ethereum",
        network: "sepolia",
        transactionHash: "0xabc",
        recipient: "0x2222222222222222222222222222222222222222",
        asset: { type: "erc20" },
        finality: { state: "FINAL" },
        risk: { level: "LOW", signals: [] },
        evidence: [{ type: "TRANSACTION_INCLUDED", result: true }],
        policyVersion: "otv-policy-1",
        checkedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        verifier: "otv",
        kid: "otv-dev-1",
      },
      "proj_demo"
    );
    expect((await s.getVerdict("vr_test"))?.status).toBe("SPENDABLE");
    expect((await s.getUsage()).verifications).toBe(1);
    expect((await s.listVerdicts("proj_demo")).map((v) => v.verdictId)).toEqual(["vr_test"]);
  });

  it("creates a user with a default project", async () => {
    const s = new MemoryStore();
    await s.ready();
    const user = await s.createUser("new@poptrust.me", "password12", "New");
    expect(user.email).toBe("new@poptrust.me");
    expect(await s.defaultProjectId(user.id)).toMatch(/^proj_/);
  });
});
