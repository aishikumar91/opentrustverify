import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export const WEB3AUTH_PROJECT_NAME = "sectool";
export const WEB3AUTH_DEFAULT_JWKS = "https://api-auth.web3auth.io/.well-known/jwks.json";
export const WEB3AUTH_ISSUER = "https://api-auth.web3auth.io";
/** Public client id for the sectool project. The client secret is never given a default. */
export const WEB3AUTH_PUBLIC_CLIENT_ID =
  "BFQnBp6tI9LtWdhNGIkBum0O2pDUefxYnQboLBIxnWV1oaAEZOJknjf6zQK5OEdai8sv9BMZR78Bx-Gk1UBwO2M";

export type Web3AuthStatus = {
  projectName: string;
  network: string;
  clientIdConfigured: boolean;
  secretConfigured: boolean;
  jwksUrl: string;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let jwksUrl: string | undefined;

export function web3authStatus(): Web3AuthStatus {
  return {
    projectName: WEB3AUTH_PROJECT_NAME,
    network: process.env.WEB3AUTH_NETWORK?.trim() || "sapphire_mainnet",
    clientIdConfigured: Boolean(clientId()),
    secretConfigured: Boolean(process.env.WEB3AUTH_CLIENT_SECRET?.trim()),
    jwksUrl: process.env.WEB3AUTH_JWKS_URL?.trim() || WEB3AUTH_DEFAULT_JWKS,
  };
}

function remoteJwks() {
  const url = process.env.WEB3AUTH_JWKS_URL?.trim() || WEB3AUTH_DEFAULT_JWKS;
  if (!jwks || jwksUrl !== url) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksUrl = url;
  }
  return jwks;
}

function clientId(): string {
  return process.env.WEB3AUTH_CLIENT_ID?.trim() || WEB3AUTH_PUBLIC_CLIENT_ID;
}

export async function verifyWeb3AuthIdToken(idToken: string): Promise<JWTPayload> {
  const audience = clientId();
  if (!audience) {
    throw new Error("MetaMask Embedded Wallets is not configured on this server.");
  }
  const { payload } = await jwtVerify(idToken, remoteJwks(), {
    issuer: WEB3AUTH_ISSUER,
    audience,
    algorithms: ["ES256"],
  });
  return payload;
}
