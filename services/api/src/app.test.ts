import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { generateKeyPair, InMemoryKeyStore } from "@otv/crypto-signatures";
import { DEMO_API_KEY, DEMO_EMAIL, DEMO_PASSWORD, MemoryStore } from "./lib/store.js";
import { buildApp } from "./app.js";
import type { FastifyInstance } from "fastify";

const claim = {
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
};

describe("API app", () => {
  let app: FastifyInstance;
  const store = new MemoryStore();
  const keyStore = new InMemoryKeyStore();

  beforeAll(async () => {
    await store.ready();
    keyStore.put(generateKeyPair("otv-dev-1"));
    app = await buildApp({ store, keyStore });
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects verify without API key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/verify/incoming",
      payload: claim,
    });
    expect(res.statusCode).toBe(401);
  });

  it("verifies incoming mock transfer and stores verdict", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/verify/incoming",
      headers: { authorization: `Bearer ${DEMO_API_KEY}` },
      payload: claim,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("SPENDABLE");
    expect(body.signature).toMatch(/^[0-9a-f]+$/);
    const fetched = await app.inject({ method: "GET", url: `/v1/verdicts/${body.verdictId}` });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().verdictId).toBe(body.verdictId);
  });

  it("logs in with demo session cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    const cookie = res.cookies.find((c) => c.name === "otv_session");
    expect(cookie?.value).toBeTruthy();
    expect(res.json().sessionToken).toBe(cookie?.value);
    const me = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      cookies: { otv_session: cookie!.value },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(DEMO_EMAIL);
    expect(me.json().sessionToken).toBe(cookie?.value);

    const viaHeader = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: { "x-otv-session": res.json().sessionToken },
    });
    expect(viaHeader.statusCode).toBe(200);
  });

  it("registers a user and lists verdicts with the session", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "builder@poptrust.me", password: "securepass1", name: "Builder" },
    });
    expect(res.statusCode).toBe(200);
    const token = res.json().sessionToken as string;
    const listed = await app.inject({
      method: "GET",
      url: "/v1/verdicts",
      headers: { "x-otv-session": token },
    });
    expect(listed.statusCode).toBe(200);
    expect(Array.isArray(listed.json().verdicts)).toBe(true);
  });

  it("reports postgres-or-memory health", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/health" });
    expect(res.json().store).toBe("memory");
    expect(res.json().status).toBe("ok");
  });

  it("exposes request params on the OpenAPI document", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/openapi.json" });
    expect(res.statusCode).toBe(200);
    const spec = res.json() as {
      paths: Record<string, Record<string, { requestBody?: unknown; parameters?: { name: string }[] }>>;
    };
    const verify = spec.paths["/v1/verify/incoming"]?.post;
    expect(verify?.requestBody).toBeTruthy();
    const login = spec.paths["/v1/auth/login"]?.post;
    expect(login?.requestBody).toBeTruthy();
    const listed = spec.paths["/v1/verdicts"]?.get;
    expect(listed?.parameters?.some((p) => p.name === "q")).toBe(true);
    const one = spec.paths["/v1/verdicts/{id}"]?.get;
    expect(one?.parameters?.some((p) => p.name === "id")).toBe(true);
    const hook = spec.paths["/v1/webhooks"]?.post;
    expect(hook?.requestBody).toBeTruthy();
    const docs = await app.inject({ method: "GET", url: "/api/docs" });
    expect(docs.statusCode).toBe(200);
    expect(docs.body).toContain("/api/docs/static/swagger-initializer.js");
    const init = await app.inject({ method: "GET", url: "/api/docs/static/swagger-initializer.js" });
    expect(init.statusCode).toBe(200);
    expect(init.body).toContain("/v1/openapi.json");
  });

  it("lists multi-chain catalog including bitcoin", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/chains" });
    expect(res.statusCode).toBe(200);
    const ids = (res.json() as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toContain("ethereum");
    expect(ids).toContain("bitcoin");
    expect(ids).toContain("solana");
    expect(ids).toContain("tron");
    expect(ids).toContain("base");
  });

  it("verifies a mock bitcoin payment", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/verify/incoming",
      headers: { authorization: `Bearer ${DEMO_API_KEY}` },
      payload: {
        chain: "bitcoin",
        network: "mock",
        transactionHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        recipient: "tb1qdemo000000000000000000000000000000000",
        asset: { type: "native", symbol: "BTC" },
        expectedAmount: "100000",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("SPENDABLE");
    expect(res.json().asset.symbol).toBe("BTC");
  });

  it("does not invent a zero balance when live RPC is unavailable", async () => {
    const previousEth = process.env.ETH_RPC_URL;
    const previousGeneric = process.env.EVM_RPC_URL;
    process.env.ETH_RPC_URL = "off";
    process.env.EVM_RPC_URL = "off";
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/wallet/balance?chain=ethereum&network=mainnet&address=0x2222222222222222222222222222222222222222&asset=native",
        headers: { authorization: `Bearer ${DEMO_API_KEY}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.verification).toBe("unavailable");
      expect(body.balanceBaseUnits).toBeNull();
    } finally {
      if (previousEth === undefined) delete process.env.ETH_RPC_URL;
      else process.env.ETH_RPC_URL = previousEth;
      if (previousGeneric === undefined) delete process.env.EVM_RPC_URL;
      else process.env.EVM_RPC_URL = previousGeneric;
    }
  });

  it("rejects a token symbol as a balance identity", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/wallet/balance?chain=ethereum&network=mainnet&address=0x2222222222222222222222222222222222222222&asset=USDT",
      headers: { authorization: `Bearer ${DEMO_API_KEY}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_token_contract");
  });

  it("runs the phantom demo without touching a wallet", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/demo/verification/run",
      payload: { scenario: "phantom_event" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.mode).toBe("simulation");
    expect(body.evaluation.result).toBe("rejected");
    expect(body.evaluation.eventOnlyWouldAccept).toBe(true);
  });

  it("returns 501 for SSO until an issuer is configured", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/auth/oidc/login" });
    expect(res.statusCode).toBe(501);
    const status = await app.inject({ method: "GET", url: "/v1/auth/oidc/status" });
    expect(status.json().enabled).toBe(false);
  });

  it("lets an owner set the public URL and keeps members out", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().user.role).toBe("owner");
    const token = login.json().sessionToken as string;
    const saved = await app.inject({
      method: "PUT",
      url: "/v1/admin/settings",
      headers: { "x-otv-session": token },
      payload: { publicUrl: "https://otv.poptrust.me" },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().publicUrl).toBe("https://otv.poptrust.me");
    const rejectedKey = await app.inject({
      method: "PUT",
      url: "/v1/admin/settings",
      headers: { "x-otv-session": token },
      payload: { publicUrl: "https://otv.poptrust.me", apiKey: "otv_live_secret" },
    });
    expect(rejectedKey.statusCode).toBe(400);

    const member = await store.createUser("member-role@poptrust.me", "member-pass-1", "Member");
    const demoOrg = await store.defaultOrgId("user_demo");
    store.userOrgs.set(member.id, demoOrg ?? "");
    const demoted = await app.inject({
      method: "PUT",
      url: "/v1/admin/members",
      headers: { "x-otv-session": token },
      payload: { email: member.email, role: "member" },
    });
    expect(demoted.statusCode).toBe(200);
    const memberLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: member.email, password: "member-pass-1" },
    });
    expect(memberLogin.json().user.role).toBe("member");
    const blocked = await app.inject({
      method: "GET",
      url: "/v1/admin/settings",
      headers: { "x-otv-session": memberLogin.json().sessionToken },
    });
    expect(blocked.statusCode).toBe(403);
    const byKey = await app.inject({
      method: "GET",
      url: "/v1/admin/settings",
      headers: { authorization: `Bearer ${DEMO_API_KEY}` },
    });
    expect(byKey.statusCode).toBe(200);
    expect(byKey.json().role).toBe("admin");
  });
});
