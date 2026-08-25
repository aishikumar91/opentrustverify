import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Logo, Sidebar, StatusBadge } from "@otv/ui";
import type { Verdict } from "@otv/verdict-schema";

const API_BASE = import.meta.env.VITE_OTV_API_URL ?? "http://localhost:4080";
const DEMO_KEY = import.meta.env.VITE_OTV_API_KEY ?? "otv_test_demo_key_change_me";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/verifications", label: "Verifications" },
  { href: "/transactions", label: "Transactions" },
  { href: "/evidence", label: "Evidence" },
  { href: "/wallets", label: "Wallets" },
  { href: "/api", label: "API" },
  { href: "/sdks", label: "SDKs" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/analytics", label: "Analytics" },
  { href: "/billing", label: "Billing" },
  { href: "/team", label: "Team" },
  { href: "/security", label: "Security" },
  { href: "/settings", label: "Settings" },
];

function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="flex min-h-screen">
      <Sidebar items={NAV} active={loc.pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--otv-border)] px-4 md:px-6">
          <div className="md:hidden">
            <Logo />
          </div>
          <input
            aria-label="Search"
            placeholder="Search hash, wallet, verdict…"
            className="hidden w-full max-w-md rounded-[10px] border border-[var(--otv-border)] bg-[var(--otv-surface-muted)] px-3 py-2 text-sm md:block"
          />
          <div className="text-sm text-[var(--otv-text-secondary)]">Demo Org</div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <nav className="flex border-t border-[var(--otv-border)] md:hidden" aria-label="Mobile">
          {NAV.slice(0, 4).map((n) => (
            <a key={n.href} href={n.href} className="flex-1 py-3 text-center text-xs text-[var(--otv-text-secondary)]">
              {n.label}
            </a>
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

function Overview() {
  const [usage, setUsage] = useState({ verifications: 0, webhooks: 0 });
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/v1/usage`, {
        headers: { Authorization: `Bearer ${DEMO_KEY}` },
      });
      if (res.ok) setUsage(await res.json());
      // seed one verification for demo dashboards
      const v = await fetch(`${API_BASE}/v1/verify/incoming`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEMO_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chain: "ethereum",
          network: "sepolia",
          transactionHash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
          recipient: "0x2222222222222222222222222222222222222222",
          asset: {
            type: "erc20",
            contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            symbol: "USDC",
          },
          expectedAmount: "1000000",
        }),
      });
      if (v.ok) {
        const verdict = (await v.json()) as Verdict;
        setVerdicts([verdict]);
      }
    })().catch(() => undefined);
  }, []);

  const verified = verdicts.filter((v) => v.status === "SPENDABLE").length;
  const pending = verdicts.filter((v) => ["PENDING", "OBSERVED", "EXECUTED"].includes(v.status)).length;
  const rejected = verdicts.filter((v) => v.status === "REJECTED").length;
  const suspicious = verdicts.filter((v) => v.status === "SUSPICIOUS").length;

  return (
    <Layout>
      <h1 className="mb-6 text-2xl font-bold">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total verifications" value={usage.verifications || verdicts.length} />
        <Stat label="Verified" value={verified} />
        <Stat label="Pending" value={pending} />
        <Stat label="Rejected / Suspicious" value={`${rejected} / ${suspicious}`} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Stat label="Avg latency" value="~local" />
        <Stat label="API usage (webhooks)" value={usage.webhooks} />
      </div>
      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-[var(--otv-text-secondary)]">
          RECENT VERDICTS
        </h2>
        {verdicts.length === 0 ? (
          <EmptyState title="No verifications yet" description="Run the public verifier or SDK against the local API." />
        ) : (
          <ul className="space-y-3">
            {verdicts.map((v) => (
              <li key={v.verdictId} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--otv-border)] pb-3">
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

function Simple({ title, body }: { title: string; body: string }) {
  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <Card>
        <p className="text-[var(--otv-text-secondary)]">{body}</p>
      </Card>
    </Layout>
  );
}

function ApiKeys() {
  const [created, setCreated] = useState<{ raw?: string; prefix?: string } | null>(null);
  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">API</h1>
      <Card className="space-y-4">
        <p className="text-sm text-[var(--otv-text-secondary)]">
          Demo key (local): <code className="otv-mono">{DEMO_KEY}</code>
        </p>
        <Button
          type="button"
          onClick={async () => {
            const res = await fetch(`${API_BASE}/v1/api-keys`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId: "proj_demo", name: "Dashboard key" }),
            });
            const data = await res.json();
            setCreated({ raw: data.raw, prefix: data.record?.prefix });
          }}
        >
          Generate API key
        </Button>
        {created?.raw && (
          <p className="otv-mono text-sm text-[var(--otv-success)]">
            New key (copy now): {created.raw}
          </p>
        )}
      </Card>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/verifications" element={<Simple title="Verifications" body="Search by transaction hash, wallet, or verdict ID." />} />
        <Route path="/transactions" element={<Simple title="Transactions" body="Transaction detail views show evidence, timeline, finality, and risk." />} />
        <Route path="/evidence" element={<Simple title="Evidence" body="Every verdict includes explainable evidence records." />} />
        <Route path="/wallets" element={<Simple title="Wallets" body="Tracked recipient wallets for verification history." />} />
        <Route path="/api" element={<ApiKeys />} />
        <Route path="/sdks" element={<Simple title="SDKs" body="TypeScript, React, and Flutter (stub) SDKs under packages/." />} />
        <Route path="/webhooks" element={<Simple title="Webhooks" body="Signed webhook delivery with retries and idempotency keys." />} />
        <Route path="/analytics" element={<Simple title="Analytics" body="Latency, success rate, and usage metrics (observability hooks)." />} />
        <Route path="/billing" element={<Simple title="Billing" body="FREE / DEVELOPER / BUSINESS / ENTERPRISE — provider abstracted." />} />
        <Route path="/team" element={<Simple title="Team" body="Organizations, memberships, RBAC — schema ready." />} />
        <Route path="/security" element={<Simple title="Security" body="Sessions, audit logs, key events, and alerts." />} />
        <Route path="/settings" element={<Simple title="Settings" body="Project configuration and policy version selection." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
