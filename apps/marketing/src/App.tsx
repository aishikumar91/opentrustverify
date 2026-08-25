import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Button, Logo, Navbar, TrustState } from "@otv/ui";
import { product } from "@otv/config";

function Shell({ children }: { children: React.ReactNode }) {
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
            <Button variant="ghost" onClick={() => (window.location.href = "http://localhost:4082")}>
              Verifier
            </Button>
            <Button onClick={() => (window.location.href = "http://localhost:4081")}>Start Building</Button>
          </>
        }
      />
      {children}
      <footer className="border-t border-[var(--otv-border)] py-10">
        <div className="otv-container flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Logo />
          <p className="text-sm text-[var(--otv-text-muted)]">
            A POP Trust product · {product.domain}
          </p>
        </div>
      </footer>
    </div>
  );
}

function Page({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <main className="otv-container py-20">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--otv-text-secondary)]">{body}</p>
      </main>
    </Shell>
  );
}

function Home() {
  return (
    <Shell>
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
              <Button onClick={() => (window.location.href = "http://localhost:4081")}>Start Building</Button>
              <Button variant="secondary" onClick={() => (window.location.href = "/developers")}>
                Explore the Standard
              </Button>
            </div>
          </div>
          <div className="animate-[fadeUp_600ms_var(--otv-ease)]">
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
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[fadeUp_600ms_var\\(--otv-ease\\)\\] { animation: none !important; }
        }
      `}</style>
    </Shell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/product"
          element={
            <Page
              title="Product"
              body="Vendor-neutral verification infrastructure for wallets, exchanges, explorers, and fintech apps."
            />
          }
        />
        <Route
          path="/how-it-works"
          element={
            <Page
              title="How it works"
              body="Claim → lookup → execution → asset → recipient → amount → balance → finality → spendability → signed verdict."
            />
          }
        />
        <Route
          path="/developers"
          element={
            <Page
              title="Developers"
              body="Integrate with the TypeScript SDK, React hooks, and OpenAPI. Docs run at docs.verify.poptrust.me."
            />
          }
        />
        <Route
          path="/security"
          element={
            <Page
              title="Security"
              body="Threat-modeled API, hashed API keys, signed webhooks, server-side signing keys, and auditable evidence."
            />
          }
        />
        <Route
          path="/standards"
          element={<Page title="Standards" body="OTV RFCs define verdict schema, wallet profile, explorer profile, and conformance." />}
        />
        <Route
          path="/research"
          element={<Page title="Research" body="Competitor analysis and consumer-protection research informed by emerging-market realities." />}
        />
        <Route
          path="/pricing"
          element={<Page title="Pricing" body="FREE · DEVELOPER · BUSINESS · ENTERPRISE. Metered verifications with a replaceable billing provider." />}
        />
        <Route
          path="/company"
          element={<Page title="Company" body="A POP Trust product — global infrastructure standard born from a real consumer-protection problem." />}
        />
        <Route
          path="/contact"
          element={<Page title="Contact" body="enterprise@poptrust.me · support for verify.poptrust.me" />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
