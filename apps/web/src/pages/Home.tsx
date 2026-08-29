import { Link } from "react-router-dom";
import { Button, TrustState } from "@otv/ui";
import { product } from "@otv/config";

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="otv-container grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.28em] text-[var(--otv-brand)]">
              OPENTRUST VERIFY
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
              {product.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--otv-text-secondary)]">
              Independent verification for wallets, exchanges, explorers, and fintech apps. Submit a
              claim, get a signed verdict: whether an incoming transfer is spendable value, not just a
              chain event.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button type="button">Create an account</Button>
              </Link>
              <Link to="/docs">
                <Button variant="secondary" type="button">
                  Read the API
                </Button>
              </Link>
              <Link to="/verifier">
                <Button variant="ghost" type="button">
                  Public verifier
                </Button>
              </Link>
            </div>
          </div>
          <div>
            <TrustState
              status="SPENDABLE"
              evidence={[
                { type: "TRANSACTION_INCLUDED", result: true },
                { type: "EXECUTION_SUCCESS", result: true },
                { type: "ASSET_MATCH", result: true },
                { type: "RECIPIENT_MATCH", result: true },
                { type: "BALANCE_DELTA", result: true },
                { type: "FINALITY", result: true },
                { type: "SPENDABILITY", result: true },
              ]}
            />
            <p className="mt-3 text-center text-xs text-[var(--otv-text-muted)]">
              Signed verdict · Incoming Transfer
            </p>
          </div>
        </div>
      </section>
      <section className="border-t border-[var(--otv-border)] py-16">
        <div className="otv-container grid gap-10 md:grid-cols-3">
          {[
            {
              t: "Never collapse concepts",
              d: "Activity ≠ execution ≠ transfer ≠ balance ≠ finality ≠ spendable funds.",
            },
            {
              t: "Signed verdicts",
              d: "Deterministic evidence pipeline with Ed25519 signatures wallets can independently verify.",
            },
            {
              t: "Built for integrators",
              d: "REST API, TypeScript SDK, React hooks, explorer components, HMAC webhooks.",
            },
          ].map((x) => (
            <div key={x.t}>
              <h2 className="text-xl font-semibold">{x.t}</h2>
              <p className="mt-2 text-[var(--otv-text-secondary)]">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
