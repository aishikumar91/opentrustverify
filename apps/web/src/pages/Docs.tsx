import { Link } from "react-router-dom";
import { Logo } from "@otv/ui";

const sections = [
  "Introduction",
  "Quickstart",
  "Authentication",
  "Verification API",
  "Verdict Schema",
  "Wallet Integration",
  "React SDK",
  "TypeScript SDK",
  "Webhooks",
  "Security",
  "Sandbox",
  "Changelog",
];

export function DocsPage() {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--otv-border)] p-4 md:border-b-0 md:border-r">
        <Logo href="/" />
        <nav className="mt-8 space-y-1" aria-label="Docs">
          {sections.map((s) => (
            <a
              key={s}
              href={`#${s.toLowerCase().replace(/\s+/g, "-")}`}
              className="block rounded-lg px-2 py-1.5 text-sm text-[var(--otv-text-secondary)] hover:bg-[var(--otv-surface-muted)]"
            >
              {s}
            </a>
          ))}
        </nav>
        <div className="mt-8 space-y-2 text-sm">
          <Link to="/verifier" className="block text-[var(--otv-brand)]">
            Open verifier →
          </Link>
          <Link to="/dashboard" className="block text-[var(--otv-brand)]">
            Open dashboard →
          </Link>
        </div>
      </aside>
      <main className="otv-container max-w-3xl py-10">
        <h1 id="introduction" className="text-4xl font-bold">
          OpenTrust Verify Docs
        </h1>
        <p className="mt-3 text-lg text-[var(--otv-text-secondary)]">
          Trust the balance, not just the blockchain event.
        </p>

        <section id="quickstart" className="mt-12">
          <h2 className="text-2xl font-semibold">Quickstart</h2>
          <pre className="otv-mono mt-4 overflow-x-auto rounded-[12px] border border-[var(--otv-border)] bg-[var(--otv-surface)] p-4 text-xs">{`import { OpenTrustVerify } from "@otv/sdk-core";
const otv = new OpenTrustVerify({ baseUrl, apiKey });
const result = await otv.verifyIncomingTransfer({
  chain, network, transactionHash, recipient, asset
});`}</pre>
        </section>

        <section id="authentication" className="mt-12">
          <h2 className="text-2xl font-semibold">Authentication</h2>
          <p className="mt-2 text-[var(--otv-text-secondary)]">
            Send <code className="otv-mono">Authorization: Bearer otv_live_…</code> or{" "}
            <code className="otv-mono">X-OTV-Api-Key</code>.
          </p>
        </section>

        <section id="verification-api" className="mt-12">
          <h2 className="text-2xl font-semibold">Verification API</h2>
          <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">POST /v1/verify/incoming</p>
        </section>

        {[
          ["verdict-schema", "Verdict Schema", "Schema id otv.verdict.v1"],
          ["wallet-integration", "Wallet Integration", "Map status to safe notifications."],
          ["react-sdk", "React SDK", "useIncomingVerification, useVerification, useVerdict"],
          ["typescript-sdk", "TypeScript SDK", "@otv/sdk-core OpenTrustVerify class"],
          ["webhooks", "Webhooks", "HMAC-signed events: created, updated, final, failed, suspicious"],
          ["security", "Security", "Hashed API keys, rate limits, server-side signing"],
          ["sandbox", "Sandbox", "This Vercel preview runs in-browser demo verification."],
          ["changelog", "Changelog", "0.1.0-mvp — OTV platform + Vercel UI preview"],
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
