export const SITE_ORIGIN = "https://otv.poptrust.me";

export type SeoPage = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
};

const pages: Record<string, SeoPage> = {
  "/": {
    path: "/",
    title: "OpenTrust Verify | Incoming crypto payment verification",
    description:
      "OTV by POP Trust checks whether an incoming crypto transfer increased the recipient's spendable balance. Signed verdicts for Ethereum, Bitcoin, Solana, Tron, and other EVM networks.",
    keywords:
      "incoming crypto payment verification, spendable balance, blockchain event vs payment, signed verdict, OpenTrust Verify",
  },
  "/features": {
    path: "/features",
    title: "OTV features | Signed incoming transfer verification",
    description:
      "What the OTV API checks: incoming claims, Ed25519 verdicts, EVM Bitcoin Solana and Tron adapters, explorer UI, HMAC webhooks, and the status enum.",
    keywords: "OTV features, signed verdict API, chain adapter, HMAC webhooks, verification status enum",
  },
  "/docs": {
    path: "/docs",
    title: "OTV API docs | Verify incoming web3 transfers",
    description:
      "How to call POST /v1/verify/incoming with a chain, hash, and recipient. Authentication, statuses, public verdict lookup, webhooks, and API keys.",
    keywords: "OTV API, verify incoming transfer, verdict lookup, webhook HMAC, API key",
  },
  "/about": {
    path: "/about",
    title: "About OpenTrust Verify | POP Trust",
    description:
      "OpenTrust Verify is a POP Trust product. It tells wallets and support desks whether an incoming transfer became spendable value for the named recipient.",
    keywords: "about OpenTrust Verify, POP Trust, POPTRUST TECH VENTURES, incoming transfer verification",
  },
  "/whitepaper": {
    path: "/whitepaper",
    title: "How OTV decides spendable funds | Crypto verification model",
    description:
      "How OTV separates a chain event from execution, a transfer, a balance increase, finality, and spendable funds. Mock results are marked.",
    keywords: "spendable funds model, balance change vs transfer log, crypto verification finality",
  },
  "/security": {
    path: "/security",
    title: "OTV security | API keys, sessions, and signed verdicts",
    description:
      "How OTV stores API keys and sessions, signs verdicts on the server, checks webhook URLs, and keeps a language model out of the spendability path.",
    keywords: "OTV security, hashed API keys, Ed25519 verdict signature, webhook SSRF",
  },
  "/contact": {
    path: "/contact",
    title: "Contact OpenTrust Verify",
    description:
      "Contact POP Trust about the OTV API, an enterprise workspace, or a vulnerability report. Product, security, and API documentation addresses.",
    keywords: "contact OpenTrust Verify, enterprise@poptrust.me, security@poptrust.me",
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy policy | OpenTrust Verify",
    description:
      "What POP Trust collects for OTV accounts, Google sign-in, verification claims, cookies, retention, and how to export or delete a workspace.",
  },
  "/terms": {
    path: "/terms",
    title: "Terms of use | OpenTrust Verify",
    description:
      "Hosted OTV API terms. Verdicts are signed evidence, not custody, legal advice, or a payment instruction. Mock adapters are not chain proof.",
  },
  "/verifier": {
    path: "/verifier",
    title: "Public crypto verifier | Check an incoming transfer",
    description:
      "Look up a stored OTV verdict by ID with no key, or sign in and submit a chain, hash, and recipient for a new check.",
    keywords: "public crypto verifier, verdict ID lookup, incoming transfer check",
  },
  "/login": {
    path: "/login",
    title: "Log in | OpenTrust Verify",
    description: "Sign in to the OTV dashboard with email or Google to manage API keys, webhooks, and verdicts.",
  },
  "/register": {
    path: "/register",
    title: "Create an OTV account | Free crypto verification API",
    description: "Register for OpenTrust Verify. You get a workspace, a default project, and the free plan so you can mint a key.",
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
