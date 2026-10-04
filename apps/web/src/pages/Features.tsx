import { Link } from "react-router-dom";
import { buttonClassName, BtnText } from "@otv/ui";
import { product } from "@otv/config";
import { ExplorerSearchBar } from "@/components/ExplorerSearchBar";
import { FaqList, type FaqItem } from "@/components/FaqList";

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

const FEATURE_FAQS: FaqItem[] = [
  {
    q: "What do I send in a claim?",
    a: "Chain, network, transaction hash, and recipient. You can also pass an asset and an expected amount. The engine does not invent those fields from a bare hash.",
  },
  {
    q: "What comes back?",
    a: "A signed otv.verdict.v1 record: a status from the enum, the evidence that produced it, and an Ed25519 signature. Clients can POST that payload to /v1/verdicts/verify. This website never signs.",
  },
  {
    q: "Can I check a token that is not on the asset list?",
    a: "Yes, on EVM networks. GET /v1/assets is a convenience list. Any ERC-20, ERC-721, or ERC-1155 still verifies if you pass the contract, and a token id when the asset needs one.",
  },
  {
    q: "Why is SPENDABLE not the same word as paid?",
    a: "Paid collapses several facts into one label. A transfer log, a balance change, and finality can disagree. The enum keeps those steps visible so a wallet does not relabel a partial result.",
  },
];

export function FeaturesPage() {
  return (
    <>
      <section className="otv-page-hero">
        <div className="otv-container otv-split">
          <div>
            <p className="otv-kicker">Product</p>
            <h1 className="otv-display otv-display-page">What {product.shortName} actually does</h1>
          </div>
          <div>
            <p className="otv-lede mt-0">
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((x, i) => (
              <div key={x.t} className={`otv-card ${i === 0 ? "otv-card-feature xl:col-span-2" : ""}`}>
                <span className="otv-tag">{x.tag}</span>
                <h3 className="mt-4 text-2xl font-bold uppercase tracking-tight">{x.t}</h3>
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
        <div className="otv-container otv-split items-start">
          <div>
            <h2 className="otv-heading">How a desk reads a verdict</h2>
            <p className="mt-4 text-[var(--otv-text-secondary)]">
              The signed row is the record. Your product maps OBSERVED through SPENDABLE. Do not
              relabel SPENDABLE as paid. Raw chain data can stay beside it. The{" "}
              <Link className="text-[var(--otv-brand)]" to="/whitepaper">
                model
              </Link>{" "}
              is the longer explanation of why the steps are not interchangeable.
            </p>
          </div>
          <div className="space-y-4 text-[var(--otv-text-secondary)]">
            <h2 className="otv-heading text-[length:clamp(1.6rem,3vw,2.4rem)]">Wallet products</h2>
            <p>
              MetaMask, Coinbase Wallet, Trust Wallet, Phantom, Ledger, and the rest of that market can
              call POST /v1/verify/incoming if they can make an HTTP request from a backend. Naming
              them here is not a partnership or an OTV certification.
            </p>
            <p className="mb-0">
              The key belongs on that backend. The browser, if you show a verdict at all, verifies the
              signature. It does not create one. Start from the{" "}
              <Link className="text-[var(--otv-brand)]" to="/docs">
                first request
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="otv-section otv-section-tint">
        <div className="otv-container otv-split items-start">
          <div>
            <p className="otv-kicker">Questions</p>
            <h2 className="otv-heading">Using the API</h2>
          </div>
          <FaqList items={FEATURE_FAQS} />
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
