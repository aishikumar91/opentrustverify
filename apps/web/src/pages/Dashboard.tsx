import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, EmptyState, Input, StatusBadge } from "@otv/ui";
import type { Verdict } from "@otv/verdict-schema";
import type { PublicApiKey, PublicWebhook } from "@otv/api-client";
import { useAuth } from "@/lib/auth";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <div className="text-xs tracking-wide text-[var(--otv-text-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Card>
  );
}

export function DashboardOverview() {
  const { client } = useAuth();
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [usage, setUsage] = useState({ verifications: 0, webhooks: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, meters] = await Promise.all([client.listVerdicts(), client.getUsage()]);
        if (cancelled) return;
        setVerdicts(list);
        setUsage(meters);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const verified = verdicts.filter((v) => v.status === "SPENDABLE").length;
  const pending = verdicts.filter((v) => ["PENDING", "OBSERVED", "EXECUTED"].includes(v.status)).length;
  const rejected = verdicts.filter((v) => v.status === "REJECTED").length;
  const suspicious = verdicts.filter((v) => v.status === "SUSPICIOUS").length;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Overview</h1>
      {error && (
        <div className="mb-4">
          <Alert tone="danger" title="Could not load">
            {error}
          </Alert>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total verifications" value={usage.verifications || verdicts.length} />
        <Stat label="Spendable" value={verified} />
        <Stat label="Pending" value={pending} />
        <Stat label="Rejected / Suspicious" value={`${rejected} / ${suspicious}`} />
      </div>
      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-[var(--otv-text-secondary)]">
          Recent verdicts
        </h2>
        {verdicts.length === 0 ? (
          <EmptyState title="No verifications yet" description="Open Verifications and submit a hash, or use the public verifier after you sign in." />
        ) : (
          <ul className="space-y-3">
            {verdicts.slice(0, 12).map((v) => (
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
    </>
  );
}

export function DashboardVerifications() {
  const { client } = useAuth();
  const [query, setQuery] = useState("");
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    chain: "ethereum",
    network: "sepolia",
    transactionHash: "",
    recipient: "",
    contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    amount: "",
  });
  const [created, setCreated] = useState<Verdict | null>(null);

  async function refresh(q?: string) {
    const list = await client.listVerdicts(q);
    setVerdicts(list);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await refresh(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const verdict = await client.verifyIncoming({
        chain: form.chain,
        network: form.network,
        transactionHash: form.transactionHash,
        recipient: form.recipient,
        asset: { type: "erc20", contract: form.contract, symbol: "USDC", decimals: 6 },
        expectedAmount: form.amount || undefined,
      });
      setCreated(verdict);
      await refresh(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verify failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Verifications</h1>
      {error && (
        <div className="mb-4">
          <Alert tone="danger" title="Error">
            {error}
          </Alert>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold tracking-wide text-[var(--otv-text-secondary)]">New claim</h2>
          <form className="mt-4 space-y-3" onSubmit={onVerify}>
            <Input placeholder="Chain" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} />
            <Input placeholder="Network" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} />
            <Input className="otv-mono" placeholder="Transaction hash" value={form.transactionHash} onChange={(e) => setForm({ ...form, transactionHash: e.target.value })} required />
            <Input className="otv-mono" placeholder="Recipient" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} required />
            <Input className="otv-mono" placeholder="Asset contract" value={form.contract} onChange={(e) => setForm({ ...form, contract: e.target.value })} />
            <Input className="otv-mono" placeholder="Expected amount (optional)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Verifying…" : "Verify incoming transfer"}
            </Button>
          </form>
          {created && (
            <p className="otv-mono mt-3 text-xs text-[var(--otv-success)]">
              {created.verdictId} · {created.status}
            </p>
          )}
        </Card>
        <Card>
          <form className="mb-4 flex gap-2" onSubmit={onSearch}>
            <Input
              aria-label="Search"
              placeholder="Search hash, wallet, verdict…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" size="sm" variant="secondary">
              Search
            </Button>
          </form>
          {verdicts.length === 0 ? (
            <EmptyState title="No matching verdicts" description="Submit a claim or clear the search." />
          ) : (
            <ul className="space-y-3">
              {verdicts.map((v) => (
                <li key={v.verdictId} className="flex items-center justify-between gap-3 border-b border-[var(--otv-border)] pb-3">
                  <div>
                    <Link className="otv-mono text-sm text-[var(--otv-brand)]" to={`/verifier?id=${v.verdictId}`}>
                      {v.verdictId}
                    </Link>
                    <div className="otv-mono text-xs text-[var(--otv-text-muted)]">{v.transactionHash}</div>
                  </div>
                  <StatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

export function DashboardApi() {
  const { client } = useAuth();
  const [keys, setKeys] = useState<PublicApiKey[]>([]);
  const [raw, setRaw] = useState<string | null>(null);
  const [name, setName] = useState("Production key");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setKeys(await client.listApiKeys());
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load keys"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">API keys</h1>
      {error && (
        <div className="mb-4">
          <Alert tone="danger" title="Error">
            {error}
          </Alert>
        </div>
      )}
      <Card className="space-y-4">
        <p className="text-sm text-[var(--otv-text-secondary)]">
          The secret is shown once. Put it in your server. This dashboard uses your sign-in. Machines
          should use a key.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              setError(null);
              try {
                const created = await client.createApiKey(name);
                setRaw(created.raw);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Create failed");
              }
            }}
          >
            Create key
          </Button>
        </div>
        {raw && (
          <Alert tone="info" title="Copy now. We will not show this secret again.">
            <span className="otv-mono text-xs">{raw}</span>
          </Alert>
        )}
        {keys.length === 0 ? (
          <EmptyState title="No keys yet" description="Create a key for your server." />
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="flex justify-between gap-3 border-b border-[var(--otv-border)] py-2 text-sm">
                <span>{k.name}</span>
                <span className="otv-mono text-[var(--otv-text-muted)]">{k.prefix}…</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export function DashboardWebhooks() {
  const { client } = useAuth();
  const [hooks, setHooks] = useState<PublicWebhook[]>([]);
  const [url, setUrl] = useState("https://example.com/otv/webhook");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setHooks(await client.listWebhooks());
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Webhooks</h1>
      {error && (
        <div className="mb-4">
          <Alert tone="danger" title="Error">
            {error}
          </Alert>
        </div>
      )}
      <Card className="space-y-4">
        <p className="text-sm text-[var(--otv-text-secondary)]">
          Each delivery is signed. Private and loopback URLs are refused so a webhook cannot scan an
          internal network.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-[16rem] flex-1" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              setError(null);
              try {
                const created = await client.createWebhook(url);
                setSecret(created.secret);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Create failed");
              }
            }}
          >
            Add endpoint
          </Button>
        </div>
        {secret && (
          <Alert tone="info" title="Webhook signing secret (copy once)">
            <span className="otv-mono text-xs">{secret}</span>
          </Alert>
        )}
        {hooks.length === 0 ? (
          <EmptyState title="No webhooks" description="Add a public HTTPS endpoint." />
        ) : (
          <ul className="space-y-2 text-sm">
            {hooks.map((h) => (
              <li key={h.id} className="border-b border-[var(--otv-border)] py-2">
                <div className="otv-mono">{h.url}</div>
                <div className="text-xs text-[var(--otv-text-muted)]">{h.events.join(", ")}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export function DashboardBilling() {
  const { client } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof client.getBilling>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .getBilling()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load billing"));
  }, [client]);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Billing</h1>
      {error && (
        <Alert tone="danger" title="Error">
          {error}
        </Alert>
      )}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Plan" value={data.plan} />
          <Stat label="Provider" value={data.provider} />
          <Stat label="Verifications" value={data.usage.verifications} />
          <Stat label="Webhook deliveries" value={data.usage.webhooks} />
        </div>
      )}
      <Card className="mt-6">
        <p className="text-sm text-[var(--otv-text-secondary)]">
          Plans on this host: {data?.plans.join(" · ") ?? "…"}. Card payments are not taken on this
          page. The numbers are your live usage.
        </p>
      </Card>
    </>
  );
}

export function DashboardAudit() {
  const { client } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; at: string; actor: string; action: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listAudit()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load audit"));
  }, [client]);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Audit</h1>
      {error && (
        <Alert tone="danger" title="Error">
          {error}
        </Alert>
      )}
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No audit events" description="Logins, key creation, and verifications appear here." />
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--otv-border)] py-2">
                <span>
                  {r.action} · {r.actor}
                </span>
                <span className="text-[var(--otv-text-muted)]">{new Date(r.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export function DashboardSettings() {
  const { user, projectId, orgId } = useAuth();
  const ids = useMemo(() => ({ email: user?.email, projectId, orgId }), [user, projectId, orgId]);
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Settings</h1>
      <Card className="space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-[var(--otv-text-muted)]">Email</span>
          <span>{ids.email}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[var(--otv-text-muted)]">Project</span>
          <span className="otv-mono">{ids.projectId ?? "-"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[var(--otv-text-muted)]">Organization</span>
          <span className="otv-mono">{ids.orgId ?? "-"}</span>
        </div>
        <p className="text-[var(--otv-text-secondary)]">
          Your account uses one default project today. Extra projects can be created from the API if
          you need a split between staging and production.
        </p>
      </Card>
    </>
  );
}
