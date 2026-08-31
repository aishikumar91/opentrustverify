export const SITE_ORIGIN = "https://otv.poptrust.me";

export type SeoPage = {
  title: string;
  description: string;
  path: string;
};

const pages: Record<string, SeoPage> = {
  "/": {
    path: "/",
    title: "OpenTrust Verify | Incoming crypto payment verification",
    description:
      "OTV by POP Trust verifies incoming crypto transfers. Check Ethereum, Bitcoin, Solana, Tron, and EVM L2s so a wallet or exchange can tell spendable value from a chain event.",
  },
  "/docs": {
    path: "/docs",
    title: "OTV API docs | Verify incoming web3 transfers",
    description:
      "Call POST /v1/verify/incoming with a chain, hash, and recipient. Get a signed verdict for crypto payment verification, webhooks, and API keys.",
  },
  "/about": {
    path: "/about",
    title: "About OpenTrust Verify | POP Trust",
    description:
      "OpenTrust Verify is how POP Trust answers whether an incoming blockchain transfer became money the recipient can spend.",
  },
  "/whitepaper": {
    path: "/whitepaper",
    title: "How OTV decides spendable funds | Crypto verification model",
    description:
      "Inclusion, execution, asset match, balance change, and finality. Why a blockchain event is not the same as a spendable incoming payment.",
  },
  "/security": {
    path: "/security",
    title: "OTV security | API keys, sessions, and signed verdicts",
    description:
      "Hashed API keys, hashed sessions, HMAC webhooks, and verdict signatures that never leave the OpenTrust Verify API.",
  },
  "/contact": {
    path: "/contact",
    title: "Contact OpenTrust Verify",
    description: "Reach POP Trust about the OTV verification API, enterprise access, and integration help.",
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy policy | OpenTrust Verify",
    description: "What OTV collects for accounts, Google sign-in, verification claims, and stored verdicts.",
  },
  "/terms": {
    path: "/terms",
    title: "Terms of use | OpenTrust Verify",
    description: "Hosted OTV API terms. Verdicts are evidence, not custody, legal advice, or a payment instruction.",
  },
  "/verifier": {
    path: "/verifier",
    title: "Public crypto verifier | Check an incoming transfer",
    description:
      "Paste a transaction hash and recipient. OpenTrust Verify returns a signed spendable or rejected verdict you can show in support.",
  },
  "/login": {
    path: "/login",
    title: "Log in | OpenTrust Verify",
    description: "Sign in to the OTV dashboard with email or Google to manage API keys and verdicts.",
  },
  "/register": {
    path: "/register",
    title: "Create an OTV account | Free crypto verification API",
    description: "Register for OpenTrust Verify. You get a workspace, a default project, and the free plan to mint a key.",
  },
};

const fallback: SeoPage = pages["/"]!;

export function seoForPath(pathname: string): SeoPage {
  return pages[pathname] ?? fallback;
}

export const defaultKeywords = [
  "OpenTrust Verify",
  "OTV",
  "POP Trust",
  "incoming crypto payment verification",
  "web3 payment verification",
  "spendable balance",
  "blockchain event vs payment",
  "Ethereum incoming transfer",
  "Bitcoin payment verify",
  "Solana transfer check",
  "Tron TRX verification",
  "USDC deposit verification",
  "wallet risk API",
  "signed verdict",
  "crypto settlement proof",
].join(", ");
