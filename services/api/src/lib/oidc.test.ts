import { describe, expect, it } from "vitest";
import { createOidcCookie, oidcConfigured, parseOidcCookie, safeReturnTo } from "./oidc.js";

describe("oidc helpers", () => {
  it("is disabled without issuer env", () => {
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_CLIENT_ID;
    expect(oidcConfigured()).toBe(false);
  });

  it("round-trips a signed cookie", () => {
    const cookie = createOidcCookie("/dashboard");
    const parsed = parseOidcCookie(cookie.value);
    expect(parsed?.state).toBe(cookie.state);
    expect(parsed?.verifier).toBe(cookie.verifier);
    expect(parsed?.returnTo).toBe("/dashboard");
  });

  it("rejects open redirects", () => {
    expect(safeReturnTo("https://evil.example/phish")).toBe("/dashboard");
    expect(safeReturnTo("//evil.example")).toBe("/dashboard");
    expect(safeReturnTo("/verifier")).toBe("/verifier");
  });
});
