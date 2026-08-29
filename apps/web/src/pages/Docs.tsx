import { Link } from "react-router-dom";
import { API_BASE } from "@/lib/api";

export function DocsPage() {
  return (
    <main className="otv-container max-w-3xl py-10">
          <h1 id="introduction" className="text-4xl font-bold">
            OpenTrust Verify API
          </h1>
          <p className="mt-3 text-lg text-[var(--otv-text-secondary)]">
            Trust the balance, not just the blockchain event. Base URL:{" "}
            <code className="otv-mono text-sm">{API_BASE}</code>
          </p>

          <section id="quickstart" className="mt-12">
            <h2 className="text-2xl font-semibold">Quickstart</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[var(--otv-text-secondary)]">
              <li>
                <Link className="text-[var(--otv-brand)]" to="/register">
                  Create an account
                </Link>
                .
              </li>
              <li>Open the dashboard and create an API key. Copy the raw secret once.</li>
              <li>
                POST a claim to <code className="otv-mono">/v1/verify/incoming</code>.
              </li>
            </ol>
            <pre className="otv-mono mt-4 overflow-x-auto rounded-[12px] border border-[var(--otv-border)] bg-[var(--otv-surface)] p-4 text-xs">{`curl -s ${API_BASE}/v1/verify/incoming \\
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
            <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Authentication</h2>
            <p>
              <strong className="text-[var(--otv-text-primary)]">API keys</strong> for machines:{" "}
              <code className="otv-mono">Authorization: Bearer otv_live_…</code> or{" "}
              <code className="otv-mono">X-OTV-Api-Key</code>.
            </p>
            <p>
              <strong className="text-[var(--otv-text-primary)]">Sessions</strong> for the dashboard:{" "}
              <code className="otv-mono">POST /v1/auth/register</code> and{" "}
              <code className="otv-mono">POST /v1/auth/login</code> return{" "}
              <code className="otv-mono">sessionToken</code>. Send it as{" "}
              <code className="otv-mono">X-OTV-Session</code>. Cookies are also set when the browser can
              store them.
            </p>
            <p>
              <code className="otv-mono">GET /v1/auth/me</code> returns the user plus default project and
              org. Logout: <code className="otv-mono">POST /v1/auth/logout</code>.
            </p>
            <p>OIDC is specified and returns 501 until issuer and client id are configured.</p>
          </section>

          <section id="verification-api" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
            <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Verification API</h2>
            <p>
              <code className="otv-mono">POST /v1/verify/incoming</code> — session or API key. Body is an
              incoming claim (chain, network, transactionHash, recipient, optional asset and
              expectedAmount).
            </p>
            <p>
              Response is a signed verdict. Check the signature with{" "}
              <code className="otv-mono">POST /v1/verdicts/verify</code> (public).
            </p>
          </section>

          <section id="verdicts" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
            <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Verdicts</h2>
            <p>
              <code className="otv-mono">GET /v1/verdicts</code> — list for the authenticated project.
              Optional <code className="otv-mono">?q=</code> filters by verdict id, hash, or recipient.
            </p>
            <p>
              <code className="otv-mono">GET /v1/verdicts/:id</code> — public lookup of a stored verdict.
            </p>
          </section>

          <section id="webhooks" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
            <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Webhooks</h2>
            <p>
              <code className="otv-mono">POST /v1/webhooks</code> with a public HTTPS URL. Secret is
              returned once. Events default to verification.final, failed, suspicious. Delivery is
              queued in Redis and processed by the worker.
            </p>
            <p>
              <code className="otv-mono">GET /v1/webhooks</code> lists endpoints (secrets are not returned
              again).
            </p>
          </section>

          <section id="keys-usage" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
            <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Keys and usage</h2>
            <p>
              <code className="otv-mono">GET/POST /v1/api-keys</code>,{" "}
              <code className="otv-mono">POST /v1/api-keys/rotate</code>,{" "}
              <code className="otv-mono">GET /v1/usage</code>, <code className="otv-mono">GET /v1/billing</code>
              , <code className="otv-mono">GET /v1/audit</code>.
            </p>
            <p>
              Health: <code className="otv-mono">GET /v1/health</code> · readiness{" "}
              <code className="otv-mono">GET /v1/ready</code> · metrics{" "}
              <code className="otv-mono">GET /v1/metrics</code>.
            </p>
          </section>

          <section id="sdks" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
            <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">SDKs</h2>
            <p>
              TypeScript <code className="otv-mono">@otv/sdk-core</code> and{" "}
              <code className="otv-mono">@otv/api-client</code>. React hooks in{" "}
              <code className="otv-mono">@otv/sdk-react</code>. Flutter package under{" "}
              <code className="otv-mono">packages/sdk-flutter</code>.
            </p>
          </section>

          <section id="errors" className="mt-12 space-y-3 text-[var(--otv-text-secondary)]">
            <h2 className="text-2xl font-semibold text-[var(--otv-text-primary)]">Errors</h2>
            <p>401 unauthorized · 400 validation · 409 email_taken · 404 verdict not found · 501 OIDC.</p>
          </section>
    </main>
  );
}
