import { Link } from "react-router-dom";
import { buttonClassName, BtnText } from "@otv/ui";
import { product } from "@otv/config";
import { LandingArt } from "@/components/LandingArt";
import { ExplorerSearchBar } from "@/components/ExplorerSearchBar";

const FEATURES = [
  {
    tag: "Verify",
    t: "Incoming claim API",
    d: "POST /v1/verify/incoming with chain, hash, and recipient. The engine walks OBSERVED through SPENDABLE, or stops at REJECTED, SUSPICIOUS, or UNVERIFIED.",
  },
  {
    tag: "Proof",
    t: "Signed otv.verdict.v1",
    d: "Ed25519 over canonical JSON. Keys stay on the API host. Clients POST the payload to /v1/verdicts/verify. This site never signs.",
  },
  {
    tag: "Chains",
    t: "Adapters, not raw RPC",
    d: "Ethereum and other EVM networks, Bitcoin, Solana, Tron. All JSON-RPC goes through ChainAdapter. The engine never builds a node call itself.",
  },
  {
    tag: "Embed",
    t: "Explorer primitives",
    d: "VerificationBadge, VerdictCard, EvidenceTimeline, TransactionTrustPanel, SignatureVerification in @otv/ui. Keep raw chain data on screen. Label OTV separately.",
  },
  {
    tag: "Notify",
    t: "HMAC webhooks",
    d: "Redis queue otv:webhook:queue, SSRF deny-list, retries. Default events: verification.final, verification.failed, verification.suspicious.",
  },
  {
    tag: "Ops",
    t: "Workspace and keys",
    d: "Organizations, projects, hashed API keys, usage, audit. Postgres is the runtime source of truth. MemoryStore is local and test only.",
  },
];

const STATUSES = [
  ["OBSERVED", "Claim accepted"],
  ["PENDING", "Await inclusion"],
  ["EXECUTED", "Transaction on chain"],
  ["ASSET_CONFIRMED", "Asset matches the claim"],
  ["BALANCE_CONFIRMED", "Recipient balance moved"],
  ["FINAL", "Network finality rule passed"],
  ["SPENDABLE", "Signed as spendable"],
  ["REJECTED", "Invalid claim"],
  ["SUSPICIOUS", "Risk flags, not spendable"],
  ["UNVERIFIED", "Facts missing"],
] as const;

export function FeaturesPage() {
  return (
    <>
      <section className="otv-hero">
        <div className="otv-container">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.28em] text-[var(--otv-hero-copy)]">PRODUCT</p>
            <h1 className="banner_big_title">What {product.shortName} actually does</h1>
            <p className="mt-5 max-w-xl text-base text-[var(--otv-hero-copy)]">
              {product.tagline} One HTTP call. A signed status your wallet or risk desk can show. No
              custody. No LLM deciding spendability.
            </p>
            <ExplorerSearchBar compact className="mt-6" />
          </div>
        </div>
      </section>

      <section className="otv-section">
        <div className="otv-container">
          <div className="mb-10 flex flex-wrap gap-3">
            <Link to="/docs" className={buttonClassName("primary")}>
              <BtnText>Read the API</BtnText>
            </Link>
            <Link to="/whitepaper" className={buttonClassName("secondary")}>
              <BtnText>How a check runs</BtnText>
            </Link>
          </div>
          <h2 className="otv-heading mb-10">Capabilities</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((x) => (
              <div key={x.t} className="otv-card">
                <span className="otv-tag">{x.tag}</span>
                <h3 className="mt-4 text-2xl font-bold">{x.t}</h3>
                <p className="mt-3 mb-0 text-[var(--otv-text-secondary)]">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="otv-section otv-section-tint">
        <div className="otv-container">
          <h2 className="otv-heading mb-4">Statuses we will not rename</h2>
          <p className="mb-10 max-w-2xl text-[var(--otv-text-secondary)]">
            These are the enum in @otv/verdict-schema. Use them in API and UI copy. Do not invent
            synonyms such as “paid” or “confirmed” for SPENDABLE.
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            {STATUSES.map(([id, note]) => (
              <div key={id} className="border-b border-[var(--otv-border)] pb-3">
                <dt className="otv-mono text-sm font-semibold text-[var(--otv-text-primary)]">{id}</dt>
                <dd className="mt-1 mb-0 text-sm text-[var(--otv-text-secondary)]">{note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="otv-section">
        <div className="otv-container grid items-center gap-10 lg:grid-cols-2">
          <LandingArt
            src="/marketing/otv-verdict-dashboard.png"
            alt="Incoming verdicts dashboard for spendability summaries"
            size="sm"
          />
          <div>
            <h2 className="otv-heading">How a desk reads a verdict</h2>
            <p className="mt-4 text-[var(--otv-text-secondary)]">
              The signed row is the record. Your product maps OBSERVED through SPENDABLE. Do not
              relabel SPENDABLE as paid.
            </p>
          </div>
        </div>
      </section>

      <section className="otv-section">
        <div className="otv-container grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="otv-heading mb-4">Wallet integrations</h2>
            <p className="mb-0 max-w-2xl text-[var(--otv-text-secondary)]">
              MetaMask, Coinbase Wallet, Trust Wallet, Phantom, Ledger, and the rest of that market can
              call POST /v1/verify/incoming. Showing their marks here is not a partnership or an OTV
              certification.
            </p>
          </div>
          <LandingArt
            src="/marketing/otv-wallet-integrations.png"
            alt="Staggered tiles of crypto wallet products that can integrate the OTV API"
            size="wide"
          />
        </div>
      </section>

      <section className="otv-section">
        <div className="otv-container max-w-3xl space-y-4 text-[var(--otv-text-secondary)]">
          <h2 className="otv-heading text-[var(--otv-text-primary)]">What we refuse</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>We do not hold keys or send transactions.</li>
            <li>We do not replace an explorer. Raw chain data can stay visible.</li>
            <li>We do not invent a balance. Thin evidence stays UNVERIFIED or REJECTED.</li>
            <li>Signing never happens in the browser.</li>
          </ul>
          <p>
            <Link className="text-[var(--otv-brand)]" to="/docs">
              First request
            </Link>
            {" · "}
            <Link className="text-[var(--otv-brand)]" to="/security">
              Security
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
