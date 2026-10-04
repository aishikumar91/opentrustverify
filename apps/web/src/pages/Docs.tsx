import { Link } from "react-router-dom";
import { apiBase } from "@/lib/api";
import { VerdictOrbit } from "@/components/editorial";

export function DocsPage() {
  return (
    <main className="w-full max-w-3xl px-6 py-16 md:px-10">
      <div className="flex items-start justify-between gap-6">
        <div>
      <p className="otv-kicker">Integration</p>
      <h1 id="introduction" className="otv-doc-title">
        Integrate OpenTrust Verify
      </h1>
        </div>
        <VerdictOrbit />
      </div>
      <p className="mt-3 text-lg text-[var(--otv-text-secondary)]">
        You send a claim. You get a signed verdict. Base URL{" "}
        <code className="otv-mono text-sm">{apiBase()}</code>. Try every field in the{" "}
        <a className="text-[var(--otv-brand)]" href={`${apiBase()}/api/docs`}>
          interactive API
        </a>
        .
      </p>
      <p className="mt-4 text-[var(--otv-text-secondary)]">
        Read the{" "}
        <Link className="text-[var(--otv-brand)]" to="/whitepaper">
          decision model
        </Link>{" "}
        before you map a status onto a badge. The{" "}
        <Link className="text-[var(--otv-brand)]" to="/security">
          security notes
        </Link>{" "}
        cover keys, sessions, and webhooks. Keep the API key on a server.
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
        <pre className="otv-mono mt-4 overflow-x-auto rounded-[14px] border border-[var(--otv-border)] bg-[var(--otv-surface-muted)] p-4 text-xs">{`curl -s ${apiBase()}/v1/verify/incoming \\
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
          <code className="otv-mono">GET /v1/auth/me</code> returns the signed-in user, role
          (owner, admin, or member), and default project. Owner and admin can read and set the
          public URL at <code className="otv-mono">/v1/admin/settings</code>. A browser API key is
          not sent to that route. <code className="otv-mono">POST /v1/auth/logout</code> ends the
          session. Google
          sign-in is available on the hosted site via{" "}
          <code className="otv-mono">GET /v1/auth/oidc/login</code>. While{" "}
          <code className="otv-mono">GET /v1/auth/me</code> is in flight, the page shows a skeleton
          instead of the signed-in controls.
        </p>
      </section>

      <section id="lab" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Verification lab</h2>
        <p>
          <code className="otv-mono">POST /v1/demo/verification/run</code> runs a labeled simulation.
          The four scenarios are a phantom event, a balance mismatch, a valid payment, and a pending
          payment. The lab does not broadcast a transaction and it does not mint a verdict.
        </p>
      </section>

      <section id="statuses" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Statuses</h2>
        <p>
          Use the enum as-is: OBSERVED, PENDING, EXECUTED, ASSET_CONFIRMED, BALANCE_CONFIRMED, FINAL,
          SPENDABLE, REJECTED, SUSPICIOUS, UNVERIFIED. Transitions are enforced by the schema. Do not
          show SPENDABLE as “paid”.
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
          TypeScript clients ship in this repository: <code className="otv-mono">@otv/api-client</code>,{" "}
          <code className="otv-mono">@otv/sdk-core</code>, and <code className="otv-mono">@otv/sdk-react</code>.
          Call them from a server. Do not put a live key in a public website bundle. A Dart client
          lives in <code className="otv-mono">packages/sdk-flutter</code>. It is not a certified
          pub.dev package.
        </p>
        <p>
          Chain coverage is Bitcoin, Solana, Tron, and the EVM networks returned by{" "}
          <code className="otv-mono">GET /v1/chains</code>. See the{" "}
          <Link className="text-[var(--otv-brand)]" to="/features">
            feature page
          </Link>{" "}
          for what each family can verify.
        </p>
      </section>

      <section id="mistakes" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Mistakes that waste a day</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Putting a live API key in a frontend bundle.</li>
          <li>Showing SPENDABLE as “paid”, or hiding REJECTED, SUSPICIOUS, and UNVERIFIED.</li>
          <li>Treating a mock-adapter verdict as mainnet proof.</li>
          <li>Calling a node directly from your app instead of sending a claim. RPC stays inside the API adapters.</li>
        </ul>
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
