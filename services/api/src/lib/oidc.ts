import { createHash, createHmac, randomBytes } from "node:crypto";

export type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
};

export type OidcIdentity = {
  email: string;
  name?: string;
};

type CookiePayload = {
  state: string;
  verifier: string;
  returnTo: string;
  exp: number;
};

const COOKIE = "otv_oidc";

export type OidcProvider = "google" | "oidc";

export function oidcConfigured(): boolean {
  return Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID);
}

export function oidcIssuer(): string {
  return (process.env.OIDC_ISSUER ?? "").replace(/\/$/, "");
}

export function oidcProvider(): OidcProvider | undefined {
  if (!oidcConfigured()) return undefined;
  const issuer = oidcIssuer();
  if (issuer === "https://accounts.google.com" || issuer.endsWith(".google.com")) return "google";
  return "oidc";
}

export function oidcRedirectUri(): string {
  if (process.env.OIDC_REDIRECT_URI) return process.env.OIDC_REDIRECT_URI;
  const publicUrl = (process.env.OTV_PUBLIC_URL ?? "http://localhost:4080").replace(/\/$/, "");
  return `${publicUrl}/v1/auth/oidc/callback`;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
  }
  return "otv-dev-session-secret-change-me-32";
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64url");
}

function signCookie(payload: CookiePayload): string {
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function readCookie(raw?: string): CookiePayload | null {
  if (!raw || !raw.includes(".")) return null;
  const [body, mac] = raw.split(".");
  const expected = createHmac("sha256", sessionSecret()).update(body!).digest("base64url");
  if (mac !== expected) return null;
  const payload = JSON.parse(Buffer.from(body!, "base64url").toString("utf8")) as CookiePayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}

export function createOidcCookie(returnTo: string): { state: string; verifier: string; value: string } {
  const state = b64url(randomBytes(16));
  const verifier = b64url(randomBytes(32));
  const value = signCookie({
    state,
    verifier,
    returnTo: safeReturnTo(returnTo),
    exp: Date.now() + 10 * 60 * 1000,
  });
  return { state, verifier, value };
}

export function parseOidcCookie(raw?: string): CookiePayload | null {
  return readCookie(raw);
}

export function oidcCookieName(): string {
  return COOKIE;
}

export function safeReturnTo(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function fetchDiscovery(issuer = oidcIssuer()): Promise<OidcDiscovery> {
  const res = await fetch(`${issuer}/.well-known/openid-configuration`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status})`);
  const body = (await res.json()) as OidcDiscovery;
  if (!body.authorization_endpoint || !body.token_endpoint) {
    throw new Error("OIDC discovery missing authorization or token endpoint");
  }
  return body;
}

export function authorizeUrl(discovery: OidcDiscovery, state: string, verifier: string): string {
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("client_id", process.env.OIDC_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", oidcRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", process.env.OIDC_SCOPE ?? "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  if (oidcProvider() === "google") url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeCode(
  discovery: OidcDiscovery,
  code: string,
  verifier: string
): Promise<OidcIdentity> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: oidcRedirectUri(),
    client_id: process.env.OIDC_CLIENT_ID ?? "",
    code_verifier: verifier,
  });
  if (process.env.OIDC_CLIENT_SECRET) body.set("client_secret", process.env.OIDC_CLIENT_SECRET);
  const tokenRes = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) throw new Error(`OIDC token exchange failed (${tokenRes.status})`);
  const tokens = (await tokenRes.json()) as { access_token?: string; id_token?: string };
  if (discovery.userinfo_endpoint && tokens.access_token) {
    const infoRes = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { email?: string; name?: string; preferred_username?: string };
      if (info.email) return { email: info.email, name: info.name ?? info.preferred_username };
    }
  }
  if (tokens.id_token) {
    const payload = decodeJwt(tokens.id_token);
    if (payload.email) return { email: payload.email, name: payload.name };
  }
  throw new Error("OIDC provider did not return an email");
}

function decodeJwt(token: string): { email?: string; name?: string } {
  const parts = token.split(".");
  if (parts.length < 2) return {};
  return JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as {
    email?: string;
    name?: string;
  };
}
