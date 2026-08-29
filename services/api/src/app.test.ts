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
});
