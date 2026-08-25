import { Link } from "react-router-dom";
import { Button, Logo, Navbar, TrustState } from "@otv/ui";
import { product } from "@otv/config";
import { isDemoMode } from "@/lib/otv";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar
        links={[
          { href: "/product", label: "Product" },
          { href: "/how-it-works", label: "How it works" },
          { href: "/developers", label: "Developers" },
          { href: "/security", label: "Security" },
          { href: "/pricing", label: "Pricing" },
        ]}
        trailing={
          <>
            <Link to="/verifier">
              <Button variant="ghost" type="button">
                Verifier
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button type="button">Start Building</Button>
            </Link>
          </>
        }
      />
      {isDemoMode && (
        <div className="border-b border-[var(--otv-border)] bg-[var(--otv-brand-muted)] px-4 py-2 text-center text-xs text-[var(--otv-brand)]">
          Vercel preview · in-browser demo verification (no API required)
        </div>
      )}
      {children}
      <footer className="border-t border-[var(--otv-border)] py-10">
        <div className="otv-container flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Logo href="/" />
          <p className="text-sm text-[var(--otv-text-muted)]">
            A POP Trust product · {product.domain}
          </p>
        </div>
      </footer>
    </div>
  );
}

export function MarketingHome() {
  return (
    <MarketingShell>
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
              OpenTrust Verify gives wallets, exchanges and digital-asset applications an independent way
              to verify whether an incoming transaction actually represents confirmed value.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/dashboard">
                <Button type="button">Start Building</Button>
              </Link>
              <Link to="/developers">
                <Button variant="secondary" type="button">
                  Explore the Standard
                </Button>
              </Link>
              <Link to="/verifier">
                <Button variant="ghost" type="button">
                  Try the Verifier
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
              Live verification interface · Incoming Transfer
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
              d: "Deterministic evidence pipeline with cryptographic signatures wallets can verify.",
            },
            {
              t: "Built for integrators",
              d: "REST API, TypeScript SDK, React hooks, explorer components, webhooks.",
            },
          ].map((x) => (
            <div key={x.t}>
              <h2 className="text-xl font-semibold">{x.t}</h2>
              <p className="mt-2 text-[var(--otv-text-secondary)]">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

export function MarketingPage({ title, body }: { title: string; body: string }) {
  return (
    <MarketingShell>
      <main className="otv-container py-20">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--otv-text-secondary)]">{body}</p>
      </main>
    </MarketingShell>
  );
}
