import { Link } from "react-router-dom";
import { product } from "@otv/config";
import { DocArticle } from "@/components/DocArticle";

export function AboutPage() {
  return (
    <DocArticle title="About OpenTrust Verify" kicker="POP TRUST">
      <p>
        {product.name} ({product.shortName}) is digital-asset verification infrastructure under the{" "}
        {product.parentBrand} brand. Tagline: {product.tagline}
      </p>
      <p>
        Blockchain explorers correctly display events. Non-technical users often interpret those events
        as “the money has arrived.” Attackers exploit that gap with transaction hashes, pending
        transfers, token events, and apparent balances. OTV exists so product teams can show a
        recipient a signed, evidence-backed trust state instead of raw chain noise.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What OTV is</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>An independent verification API that returns <code className="otv-mono">otv.verdict.v1</code>.</li>
        <li>A deterministic engine: lookup, execution, asset, recipient, amount, balance, finality, spendability.</li>
        <li>A dashboard for keys, webhooks, usage, audit, and billing snapshot.</li>
        <li>Public lookup of an existing verdict by ID.</li>
      </ul>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What OTV is not</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Not a custodian. It does not hold user keys or send transactions.</li>
        <li>Not an explorer replacement. Raw chain data stays visible.</li>
        <li>Not a balance oracle that invents funds. It verifies observed evidence.</li>
      </ul>
      <p>
        Live product surface: this unified web app. API: Fastify on Postgres + Redis. Design: POP Trust
        true-black surfaces and brand blue <code className="otv-mono">#1e6bff</code>.
      </p>
      <p>
        <Link className="text-[var(--otv-brand)]" to="/whitepaper">
          Engineering whitepaper →
        </Link>
      </p>
    </DocArticle>
  );
}

export function WhitepaperPage() {
  return (
    <DocArticle title="OpenTrust Verify Whitepaper" kicker="ENGINEERING · v0.2">
      <p>
        Vendor-neutral verification layer. Evaluates whether an observed incoming digital-asset event
        represents verified, spendable value for a recipient. Produces explainable evidence and a
        cryptographically signed verdict for wallets, exchanges, explorers, and fintech applications.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Problem</h2>
      <p>
        Explorers show chain fidelity. Users hear “paid.” Social engineering uses technically true
        events that are not spendable value. Simulation tools protect outbound signing; OTV addresses
        inbound interpretation.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Design principles</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Never collapse activity / execution / transfer / balance / finality / spendability.</li>
        <li>Deterministic verification first; narrative only after a verdict.</li>
        <li>Evidence required for every verdict.</li>
        <li>Chain-specific policies via adapters.</li>
        <li>Vendor neutrality.</li>
        <li>Explicit confidence and mock/live honesty.</li>
      </ol>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Trust states</h2>
      <p className="otv-mono text-sm">
        OBSERVED · PENDING · EXECUTED · ASSET_CONFIRMED · BALANCE_CONFIRMED · FINAL · SPENDABLE ·
        REJECTED · SUSPICIOUS · UNVERIFIED
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Signed verdicts</h2>
      <p>
        Canonical JSON → SHA-256 → Ed25519 → hex signature + <code className="otv-mono">kid</code>. Public
        check: <code className="otv-mono">POST /v1/verdicts/verify</code>. Production keys persist on the
        API (optional wrap). HSM remains a documented next step, not a fake claim.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Runtime</h2>
      <p>
        Fastify API, Postgres source of truth, Redis rate limits and webhook queue, file keystore,
        session cookies plus <code className="otv-mono">X-OTV-Session</code> for cross-origin HTTP
        dashboards. Set <code className="otv-mono">ETH_RPC_URL</code> for live Ethereum; otherwise mock
        adapter + <code className="otv-mono">MOCK_ADAPTER</code> signal.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Limitations</h2>
      <p>
        OIDC/SSO is specified (501 until configured). Billing provider is abstracted. Certification
        marks require authorization. Market TAM/SAM figures are not published as facts.
      </p>
      <p>
        Canonical markdown: <code className="otv-mono">docs/whitepaper/OTV_WHITEPAPER.md</code> in the
        repository.
      </p>
    </DocArticle>
  );
}
