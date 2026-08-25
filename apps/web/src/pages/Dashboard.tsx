import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Logo, Sidebar, StatusBadge } from "@otv/ui";
import type { Verdict } from "@otv/verdict-schema";
import { createApiKeyDemo, DEMO_CLAIM, isDemoMode, verifyIncoming } from "@/lib/otv";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/verifications", label: "Verifications" },
  { href: "/dashboard/api", label: "API" },
  { href: "/dashboard/webhooks", label: "Webhooks" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/security", label: "Security" },
  { href: "/dashboard/settings", label: "Settings" },
];

function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="flex min-h-screen">
      <Sidebar items={NAV} active={loc.pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--otv-border)] px-4 md:px-6">
          <div className="md:hidden">
            <Logo href="/" />
          </div>
          <input
            aria-label="Search"
            placeholder="Search hash, wallet, verdict…"
            className="hidden w-full max-w-md rounded-[10px] border border-[var(--otv-border)] bg-[var(--otv-surface-muted)] px-3 py-2 text-sm md:block"
          />
          <div className="flex items-center gap-3 text-sm text-[var(--otv-text-secondary)]">
            <Link to="/verifier">Verifier</Link>
            <span>Demo Org</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <nav className="flex border-t border-[var(--otv-border)] md:hidden" aria-label="Mobile">
          {NAV.slice(0, 4).map((n) => (
            <Link key={n.href} to={n.href} className="flex-1 py-3 text-center text-xs text-[var(--otv-text-secondary)]">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <div className="text-xs tracking-wide text-[var(--otv-text-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Card>
  );
}

export function DashboardOverview() {
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);

  useEffect(() => {
    verifyIncoming(DEMO_CLAIM)
      .then((r) => setVerdicts([r.verdict]))
      .catch(() => undefined);
  }, []);

  const verified = verdicts.filter((v) => v.status === "SPENDABLE").length;

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Overview</h1>
        {isDemoMode && (
          <span className="text-xs text-[var(--otv-brand)]">Preview demo data</span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total verifications" value={verdicts.length} />
        <Stat label="Verified" value={verified} />
        <Stat label="Pending" value={0} />
        <Stat label="Rejected / Suspicious" value="0 / 0" />
      </div>
      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-[var(--otv-text-secondary)]">
          RECENT VERDICTS
        </h2>
        {verdicts.length === 0 ? (
          <EmptyState title="No verifications yet" description="Open the verifier to create one." />
        ) : (
          <ul className="space-y-3">
            {verdicts.map((v) => (
              <li
                key={v.verdictId}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--otv-border)] pb-3"
              >
                <div>
                  <div className="otv-mono text-sm">{v.verdictId}</div>
                  <div className="otv-mono text-xs text-[var(--otv-text-muted)]">{v.transactionHash}</div>
                </div>
                <StatusBadge status={v.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Layout>
  );
}

export function DashboardSimple({ title, body }: { title: string; body: string }) {
  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <Card>
        <p className="text-[var(--otv-text-secondary)]">{body}</p>
      </Card>
    </Layout>
  );
}

export function DashboardApi() {
  const [created, setCreated] = useState<{ raw?: string; prefix?: string } | null>(null);
  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">API</h1>
      <Card className="space-y-4">
        <p className="text-sm text-[var(--otv-text-secondary)]">
          Generate a demo API key for UI testing. Production keys come from the TypeScript Fastify API.
        </p>
        <Button
          type="button"
          onClick={async () => {
            const data = await createApiKeyDemo();
            setCreated(data);
          }}
        >
          Generate API key
        </Button>
        {created?.raw && (
          <p className="otv-mono text-sm text-[var(--otv-success)]">New key (copy now): {created.raw}</p>
        )}
      </Card>
    </Layout>
  );
}
