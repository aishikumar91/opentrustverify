import { Logo } from "@otv/ui";

const sections = [
  "Introduction",
  "Quickstart",
  "Authentication",
  "Verification API",
  "Verdict Schema",
  "Wallet Integration",
  "Explorer Integration",
  "React SDK",
  "TypeScript SDK",
  "Flutter SDK",
  "Webhooks",
  "Security",
  "Testing",
  "Sandbox",
  "Errors",
  "Rate Limits",
  "Changelog",
];

export default function App() {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--otv-border)] p-4 md:border-b-0 md:border-r">
        <Logo href="http://localhost:4083/" />
        <nav className="mt-8 space-y-1" aria-label="Docs">
          {sections.map((s) => (
            <a key={s} href={`#${s.toLowerCase().replace(/\s+/g, "-")}`} className="block rounded-lg px-2 py-1.5 text-sm text-[var(--otv-text-secondary)] hover:bg-[var(--otv-surface-muted)]">
              {s}
            </a>
          ))}
        </nav>
      </aside>
      <main className="otv-container max-w-3xl py-10">
        <h1 id="introduction" className="text-4xl font-bold">OpenTrust Verify Docs</h1>
        <p className="mt-3 text-lg text-[var(--otv-text-secondary)]">
          Trust the balance, not just the blockchain event.
        </p>

        <section id="quickstart" className="mt-12">
          <h2 className="text-2xl font-semibold">Quickstart</h2>
          <pre className="otv-mono mt-4 overflow-x-auto rounded-[12px] border border-[var(--otv-border)] bg-[var(--otv-surface)] p-4 text-xs">{`npm i @otv/sdk-core
const otv = new OpenTrustVerify({ baseUrl, apiKey });
const result = await otv.verifyIncomingTransfer({
  chain, network, transactionHash, recipient, asset
});`}</pre>
        </section>

        <section id="authentication" className="mt-12">
          <h2 className="text-2xl font-semibold">Authentication</h2>
          <p className="mt-2 text-[var(--otv-text-secondary)]">
            Send <code className="otv-mono">Authorization: Bearer otv_live_…</code> or <code className="otv-mono">X-OTV-Api-Key</code>.
          </p>
        </section>

        <section id="verification-api" className="mt-12">
          <h2 className="text-2xl font-semibold">Verification API</h2>
          <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">POST /v1/verify/incoming</p>
          <pre className="otv-mono mt-3 overflow-x-auto rounded-[12px] border border-[var(--otv-border)] bg-[var(--otv-surface)] p-4 text-xs">{`curl -X POST http://localhost:4080/v1/verify/incoming \\
  -H "Authorization: Bearer otv_test_demo_key_change_me" \\
  -H "Content-Type: application/json" \\
  -d '{"chain":"ethereum","network":"sepolia","transactionHash":"0xdemo...","recipient":"0x2222..."}'`}</pre>
        </section>

        <section id="verdict-schema" className="mt-12">
          <h2 className="text-2xl font-semibold">Verdict Schema</h2>
          <p className="mt-2 text-[var(--otv-text-secondary)]">
            Schema id <code className="otv-mono">otv.verdict.v1</code>. See <code className="otv-mono">docs/VERDICT_SPEC.md</code>.
          </p>
        </section>

        {[
          ["wallet-integration", "Wallet Integration", "Use verifyIncomingTransfer and map status to user-safe notifications."],
          ["explorer-integration", "Explorer Integration", "Render VerificationBadge beside raw explorer data — OTV is additive."],
          ["react-sdk", "React SDK", "useIncomingVerification, useVerification, useVerdict"],
          ["typescript-sdk", "TypeScript SDK", "@otv/sdk-core OpenTrustVerify class"],
          ["flutter-sdk", "Flutter SDK", "Stub package — TypeScript MVP first."],
          ["webhooks", "Webhooks", "HMAC-signed events: created, updated, final, failed, suspicious"],
          ["security", "Security", "Hashed API keys, rate limits, helmet, CORS, server-side signing"],
          ["testing", "Testing", "pnpm test — verdict transitions, signatures, engine"],
          ["sandbox", "Sandbox", "Mock adapter + demo API key for offline demos"],
          ["errors", "Errors", "400 validation · 401 auth · 404 · 429 · 500"],
          ["rate-limits", "Rate Limits", "Default 120 req/min per IP (Redis-ready)"],
          ["changelog", "Changelog", "0.1.0-mvp — initial OTV platform scaffold"],
        ].map(([id, title, body]) => (
          <section key={id} id={id} className="mt-12">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-[var(--otv-text-secondary)]">{body}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
