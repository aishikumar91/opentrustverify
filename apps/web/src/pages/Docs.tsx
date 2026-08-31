import { Link } from "react-router-dom";
import { API_BASE } from "@/lib/api";

export function DocsPage() {
  return (
    <main className="w-full max-w-3xl px-6 py-16 md:px-10">
      <h1 id="introduction" className="text-4xl font-bold tracking-tight md:text-5xl">
        Integrate OpenTrust Verify
      </h1>
      <p className="mt-3 text-lg text-[var(--otv-text-secondary)]">
        You send a claim. You get a signed verdict. Base URL{" "}
        <code className="otv-mono text-sm">{API_BASE}</code>. Try every field in the{" "}
        <a className="text-[var(--otv-brand)]" href={`${API_BASE}/api/docs`}>
          interactive API
        </a>
        .
      </p>

      <section id="first-request" className="mt-12">
        <h2 className="text-2xl font-semibold">First request</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[var(--otv-text-secondary)]">
          <li>
            <Link className="text-[var(--otv-brand)]" to="/register">
              Create an account
            </Link>
            .
          </li>
          <li>Open the dashboard, create an API key, and copy the secret once.</li>
          <li>
            POST a claim to <code className="otv-mono">/v1/verify/incoming</code>.
          </li>
        </ol>
        <pre className="otv-mono mt-4 overflow-x-auto rounded-[8px] border-2 border-[var(--otv-border)] bg-[var(--otv-surface-muted)] p-4 text-xs">{`curl -s ${API_BASE}/v1/verify/incoming \\
  -H "Authorization: Bearer otv_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "chain":"ethereum",
    "network":"sepolia",
    "transactionHash":"0x…",
    "recipient":"0x…",
    "asset":{"type":"erc20","contract":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","symbol":"USDC","decimals":6}
  }'`}</pre>
      </section>

      <section id="authentication" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">How you authenticate</h2>
        <p>
          Servers send an API key as{" "}
          <code className="otv-mono">Authorization: Bearer otv_live_…</code> or{" "}
          <code className="otv-mono">X-OTV-Api-Key</code>.
        </p>
        <p>
          People use the dashboard.{" "}
          <code className="otv-mono">POST /v1/auth/register</code> and{" "}
          <code className="otv-mono">POST /v1/auth/login</code> return{" "}
          <code className="otv-mono">sessionToken</code>. Send it as{" "}
          <code className="otv-mono">X-OTV-Session</code>. A cookie is set when the browser can store
          it.
        </p>
        <p>
          <code className="otv-mono">GET /v1/auth/me</code> returns the signed-in user and default
          project. <code className="otv-mono">POST /v1/auth/logout</code> ends the session. Google
          sign-in is available on the hosted site via{" "}
          <code className="otv-mono">GET /v1/auth/oidc/login</code>.
        </p>
      </section>

      <section id="verification-api" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Verify a transfer</h2>
        <p>
          <code className="otv-mono">POST /v1/verify/incoming</code> needs a session or a key. Body
          fields: chain, network, transactionHash, recipient, optional asset and expectedAmount.
        </p>
        <p>
          The response is a signed verdict. Anyone can check the signature with{" "}
          <code className="otv-mono">POST /v1/verdicts/verify</code>.
        </p>
      </section>

      <section id="verdicts" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Look up a verdict</h2>
        <p>
          <code className="otv-mono">GET /v1/verdicts</code> lists verdicts for your project. Add{" "}
          <code className="otv-mono">?q=</code> to filter by verdict id, hash, or recipient.
        </p>
        <p>
          <code className="otv-mono">GET /v1/verdicts/:id</code> is public. A support agent can open
          the same record a customer was shown.
        </p>
      </section>

      <section id="webhooks" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Webhooks</h2>
        <p>
          <code className="otv-mono">POST /v1/webhooks</code> with a public HTTPS URL. The signing
          secret is returned once. Default events: verification.final, verification.failed,
          verification.suspicious.
        </p>
        <p>
          <code className="otv-mono">GET /v1/webhooks</code> lists endpoints. Secrets are not shown
          again.
        </p>
      </section>

      <section id="keys-usage" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Keys, usage, and audit</h2>
        <p>
          Create and rotate keys with <code className="otv-mono">/v1/api-keys</code>. Read meters at{" "}
          <code className="otv-mono">/v1/usage</code> and <code className="otv-mono">/v1/billing</code>.
          Recent actions live at <code className="otv-mono">/v1/audit</code>.
        </p>
        <p>
          Liveness is <code className="otv-mono">GET /v1/health</code>. Readiness is{" "}
          <code className="otv-mono">GET /v1/ready</code>.
        </p>
      </section>

      <section id="clients" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Client libraries</h2>
        <p>
          TypeScript clients ship with the product. Use them from a server. Do not put a live key in
          a public website bundle.
        </p>
      </section>

      <section id="errors" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Errors that mean something</h2>
        <p>
          401 means the key or session is missing or wrong. 400 means the claim failed validation.
          409 means that email is already registered. 404 means no verdict with that id. 501 means
          single sign-on is not configured on this host.
        </p>
      </section>
    </main>
  );
}
