import { describe, expect, it } from "vitest";
import { verifyWeb3AuthIdToken, web3authStatus } from "./web3auth.js";

describe("web3auth project config", () => {
  it("reports sectool on sapphire_mainnet without exposing the client secret", () => {
    process.env.WEB3AUTH_CLIENT_ID = "public-client-id";
    process.env.WEB3AUTH_CLIENT_SECRET = "server-only-secret";
    process.env.WEB3AUTH_NETWORK = "sapphire_mainnet";
    process.env.WEB3AUTH_JWKS_URL = "https://api-auth.web3auth.io/.well-known/jwks.json";
    const status = web3authStatus();
    expect(status.projectName).toBe("sectool");
    expect(status.network).toBe("sapphire_mainnet");
    expect(status.clientIdConfigured).toBe(true);
    expect(status.secretConfigured).toBe(true);
    expect(status.jwksUrl).toContain("jwks.json");
    expect(JSON.stringify(status)).not.toContain("server-only-secret");
    expect(JSON.stringify(status)).not.toContain("public-client-id");
  });

  it("rejects an identity token that the project JWKS did not sign", async () => {
    process.env.WEB3AUTH_CLIENT_ID = "BFQnBp6tI9LtWdhNGIkBum0O2pDUefxYnQboLBIxnWV1oaAEZOJknjf6zQK5OEdai8sv9BMZR78Bx-Gk1UBwO2M";
    process.env.WEB3AUTH_JWKS_URL = "https://api-auth.web3auth.io/.well-known/jwks.json";
    await expect(verifyWeb3AuthIdToken("not-a-signed-token")).rejects.toThrow();
  });
});
