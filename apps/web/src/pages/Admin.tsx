import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Alert, Button, Card, EmptyState, Input, StatusBadge } from "@otv/ui";
import { VerificationStatus, type Verdict } from "@otv/verdict-schema";
import { useAuth } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  loadNotices,
  loadPrefs,
  loadSeats,
  loadTickets,
  newNotice,
  newSeat,
  newTicket,
  saveNotices,
  savePrefs,
  saveSeats,
  saveTickets,
  type Notice,
  type SeatRole,
  type Ticket,
  type TicketStatus,
  type WorkspacePrefs,
} from "@/lib/workspace-admin";

const ADMIN_NAV = [
  { to: "/dashboard/admin", label: "Overview", end: true },
  { to: "/dashboard/admin/monitoring", label: "Monitoring" },
  { to: "/dashboard/admin/analytics", label: "Analytics" },
  { to: "/dashboard/admin/settings", label: "Global settings" },
  { to: "/dashboard/admin/management", label: "Management" },
  { to: "/dashboard/admin/users", label: "Users" },
  { to: "/dashboard/admin/tickets", label: "Tickets" },
  { to: "/dashboard/admin/security", label: "Security" },
  { to: "/dashboard/admin/notifications", label: "Notifications" },
] as const;

function AdminChrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mb-4 text-sm text-[var(--otv-text-secondary)]">
        Workspace admin. Verdicts still come from the API. Tickets, seats, and inbox items stay in
        this browser for the current project.
      </p>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Admin">
        {ADMIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : false}
            className={({ isActive }) =>
              `rounded-[8px] border-2 px-3 py-1.5 text-xs font-semibold ${
                isActive
                  ? "border-[var(--otv-brand)] bg-[var(--otv-brand-muted)] text-[var(--otv-brand)]"
                  : "border-[var(--otv-border)] text-[var(--otv-text-secondary)]"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </>
  );
}

function useScope() {
  const { projectId, orgId, user } = useAuth();
  return projectId ?? orgId ?? user?.email ?? "local";
}

export function AdminHub() {
  const { client, user } = useAuth();
  const scope = useScope();
  const [usage, setUsage] = useState({ verifications: 0, webhooks: 0 });
  const unread = loadNotices(scope).filter((n) => !n.read).length;
  const openTickets = loadTickets(scope).filter((t) => t.status === "open").length;

  useEffect(() => {
    client.getUsage().then(setUsage).catch(() => undefined);
  }, [client]);

  return (
    <AdminChrome title="Admin">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs text-[var(--otv-text-muted)]">Signed in</div>
          <div className="mt-2 text-lg font-semibold">{user?.email ?? "—"}</div>
        </Card>
        <Card>
          <div className="text-xs text-[var(--otv-text-muted)]">Verifications</div>
          <div className="mt-2 text-2xl font-semibold">{usage.verifications}</div>
        </Card>
        <Card>
          <div className="text-xs text-[var(--otv-text-muted)]">Open tickets</div>
          <div className="mt-2 text-2xl font-semibold">{openTickets}</div>
        </Card>
        <Card>
          <div className="text-xs text-[var(--otv-text-muted)]">Unread notices</div>
          <div className="mt-2 text-2xl font-semibold">{unread}</div>
        </Card>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {ADMIN_NAV.filter((n) => n.to !== "/dashboard/admin").map((n) => (
          <Link key={n.to} to={n.to} className="otv-card otv-card-lift block">
            <div className="font-semibold">{n.label}</div>
            <p className="mt-1 mb-0 text-sm text-[var(--otv-text-secondary)]">Open {n.label.toLowerCase()}</p>
          </Link>
        ))}
      </div>
    </AdminChrome>
  );
}

export function AdminMonitoring() {
  const { client } = useAuth();
  const [health, setHealth] = useState<string>("…");
  const [ready, setReady] = useState<string>("…");
  const [usage, setUsage] = useState({ verifications: 0, webhooks: 0 });
  const [metrics, setMetrics] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, meters] = await Promise.all([client.health(), client.getUsage()]);
        if (cancelled) return;
        setHealth(`${h.status}${h.store ? ` · store ${h.store}` : ""}`);
        setUsage(meters);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Health failed");
      }
      try {
        const res = await fetch(`${API_BASE}/v1/ready`);
        if (!cancelled) setReady(res.ok ? "ready" : `HTTP ${res.status}`);
      } catch {
        if (!cancelled) setReady("unreachable");
      }
      try {
        const res = await fetch(`${API_BASE}/v1/metrics`);
        const text = await res.text();
        if (!cancelled) setMetrics(text.split("\n").slice(0, 24).join("\n"));
      } catch {
        if (!cancelled) setMetrics("Metrics endpoint is not reachable from this origin.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  return (
    <AdminChrome title="Monitoring">
      {error && (
        <div className="mb-4">
          <Alert tone="danger" title="API">
            {error}
          </Alert>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-[var(--otv-text-muted)]">GET /v1/health</div>
          <div className="mt-2 font-semibold">{health}</div>
        </Card>
        <Card>
          <div className="text-xs text-[var(--otv-text-muted)]">GET /v1/ready</div>
          <div className="mt-2 font-semibold">{ready}</div>
        </Card>
        <Card>
          <div className="text-xs text-[var(--otv-text-muted)]">Usage</div>
          <div className="mt-2 font-semibold">
            {usage.verifications} verifies · {usage.webhooks} webhooks
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Prometheus scrape (truncated)</h2>
        <pre className="otv-mono max-h-80 overflow-auto text-xs text-[var(--otv-text-secondary)]">{metrics || "—"}</pre>
      </Card>
    </AdminChrome>
  );
}

export function AdminAnalytics() {
  const { client } = useAuth();
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listVerdicts()
      .then(setVerdicts)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [client]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const status of VerificationStatus.options) next[status] = 0;
    for (const v of verdicts) next[v.status] = (next[v.status] ?? 0) + 1;
    return next;
  }, [verdicts]);

  return (
    <AdminChrome title="Analytics">
      {error && (
        <div className="mb-4">
          <Alert tone="danger" title="Could not load">
            {error}
          </Alert>
        </div>
      )}
      <p className="mb-4 text-sm text-[var(--otv-text-secondary)]">
        Counts use the verdict enum as stored. A chain event is not execution, a balance increase, or
        SPENDABLE.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {VerificationStatus.options.map((status) => (
          <Card key={status}>
            <StatusBadge status={status} />
            <div className="mt-3 text-2xl font-semibold">{counts[status] ?? 0}</div>
          </Card>
        ))}
      </div>
    </AdminChrome>
  );
}

export function AdminSettings() {
  const { user, projectId, orgId } = useAuth();
  const scope = useScope();
  const [prefs, setPrefs] = useState<WorkspacePrefs>(() => loadPrefs(scope));

  function update<K extends keyof WorkspacePrefs>(key: K, value: WorkspacePrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(scope, next);
  }

  return (
    <AdminChrome title="Global settings">
      <Card className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Theme</span>
          <ThemeSwitcher />
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[var(--otv-text-muted)]">Email</span>
          <span>{user?.email ?? "—"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[var(--otv-text-muted)]">Project</span>
          <span className="otv-mono">{projectId ?? "—"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[var(--otv-text-muted)]">Organization</span>
          <span className="otv-mono">{orgId ?? "—"}</span>
        </div>
        <label className="flex items-center justify-between gap-3">
          <span>Webhook delivery alerts</span>
          <input
            type="checkbox"
            checked={prefs.webhookAlerts}
            onChange={(e) => update("webhookAlerts", e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>Warn when an adapter is mock</span>
          <input
            type="checkbox"
            checked={prefs.mockWarning}
            onChange={(e) => update("mockWarning", e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>Email a copy of audit events</span>
          <input
            type="checkbox"
            checked={prefs.auditEmail}
            onChange={(e) => update("auditEmail", e.target.checked)}
          />
        </label>
        <p className="mb-0 text-[var(--otv-text-secondary)]">
          These toggles stay on this device. Production policy lives in the API host, not here.
        </p>
      </Card>
    </AdminChrome>
  );
}

export function AdminManagement() {
  return (
    <AdminChrome title="Management">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">API keys</h2>
          <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
            Mint and rotate keys on the existing keys page. Signing keys never appear in the browser.
          </p>
          <Link to="/dashboard/api" className="otv-unfill mt-4">
            Open API keys <span className="otv-unfill-icon">→</span>
          </Link>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
            HMAC endpoints for verification.final, verification.failed, and verification.suspicious.
          </p>
          <Link to="/dashboard/webhooks" className="otv-unfill mt-4">
            Open webhooks <span className="otv-unfill-icon">→</span>
          </Link>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">Plan and usage meters from GET /v1/billing.</p>
          <Link to="/dashboard/billing" className="otv-unfill mt-4">
            Open billing <span className="otv-unfill-icon">→</span>
          </Link>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Verifications</h2>
          <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
            Submit a claim. The engine stays deterministic. No LLM on the spendability path.
          </p>
          <Link to="/dashboard/verifications" className="otv-unfill mt-4">
            Open verifications <span className="otv-unfill-icon">→</span>
          </Link>
        </Card>
      </div>
    </AdminChrome>
  );
}

export function AdminUsers() {
  const { user } = useAuth();
  const scope = useScope();
  const [seats, setSeats] = useState(() => loadSeats(scope, user?.email ?? ""));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SeatRole>("member");

  function addSeat(e: FormEvent) {
    e.preventDefault();
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || seats.some((s) => s.email === nextEmail)) return;
    const next = [...seats, newSeat(nextEmail, role)];
    setSeats(next);
    saveSeats(scope, next);
    setEmail("");
  }

  function removeSeat(target: string) {
    const next = seats.filter((s) => s.email !== target || s.role === "owner");
    setSeats(next);
    saveSeats(scope, next);
  }

  return (
    <AdminChrome title="Users">
      <Card className="mb-6">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addSeat}>
          <label className="block flex-1 text-sm">
            <span className="mb-1 block text-[var(--otv-text-muted)]">Email</span>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--otv-text-muted)]">Role</span>
            <select
              className="otv-input"
              value={role}
              onChange={(e) => setRole(e.target.value as SeatRole)}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <Button type="submit">Add seat</Button>
        </form>
      </Card>
      <Card>
        {seats.length === 0 ? (
          <EmptyState title="No seats" description="Sign in and this page seeds the owner from your session." />
        ) : (
          <ul className="space-y-2 text-sm">
            {seats.map((s) => (
              <li key={s.email} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--otv-border)] py-2">
                <span>
                  {s.email} · {s.role}
                </span>
                {s.role !== "owner" && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSeat(s.email)}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminChrome>
  );
}

function nextTicketStatus(status: TicketStatus): TicketStatus {
  switch (status) {
    case "open":
      return "pending";
    case "pending":
      return "closed";
    case "closed":
      return "open";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function AdminTickets() {
  const { user } = useAuth();
  const scope = useScope();
  const [tickets, setTickets] = useState<Ticket[]>(() => loadTickets(scope));
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function persist(next: Ticket[]) {
    setTickets(next);
    saveTickets(scope, next);
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    const ticket = newTicket(user?.email ?? "unknown", subject.trim(), body.trim());
    persist([ticket, ...tickets]);
    const notices = [newNotice("ticket", `Ticket ${ticket.id}`, ticket.subject), ...loadNotices(scope)];
    saveNotices(scope, notices);
    setSubject("");
    setBody("");
  }

  return (
    <AdminChrome title="Support tickets">
      <Card className="mb-6">
        <form className="space-y-3" onSubmit={onCreate}>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--otv-text-muted)]">Subject</span>
            <Input required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--otv-text-muted)]">Details</span>
            <textarea
              className="otv-input h-28 py-3"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Include a verdict ID if this is about a claim."
            />
          </label>
          <Button type="submit">Open ticket</Button>
        </form>
      </Card>
      <Card>
        {tickets.length === 0 ? (
          <EmptyState title="No tickets" description="Open one with a verdict ID if support needs the signed record." />
        ) : (
          <ul className="space-y-3 text-sm">
            {tickets.map((t) => (
              <li key={t.id} className="border-b border-[var(--otv-border)] pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {t.subject} · {t.id}
                  </span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => persist(tickets.map((x) => (x.id === t.id ? { ...x, status: nextTicketStatus(x.status) } : x)))}>
                    {t.status}
                  </Button>
                </div>
                <p className="mt-1 mb-0 text-[var(--otv-text-secondary)]">{t.body || "No details"}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminChrome>
  );
}

export function AdminSecurity() {
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
    <AdminChrome title="Security">
      {error && (
        <Alert tone="danger" title="Error">
          {error}
        </Alert>
      )}
      <Card className="mb-6 text-sm text-[var(--otv-text-secondary)]">
        <p>
          Keys stay hashed. Verdict signing keys stay on the API host. This page reads GET /v1/audit
          for the signed-in workspace.
        </p>
        <Link to="/dashboard/security" className="otv-unfill mt-3">
          Full audit log <span className="otv-unfill-icon">→</span>
        </Link>
      </Card>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No audit events" description="Logins, key creation, and verifications appear here." />
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.slice(0, 20).map((r) => (
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
    </AdminChrome>
  );
}

export function AdminNotifications() {
  const { client, user } = useAuth();
  const scope = useScope();
  const [notices, setNotices] = useState<Notice[]>(() => loadNotices(scope));

  useEffect(() => {
    client
      .getUsage()
      .then((usage) => {
        const current = loadNotices(scope);
        if (current.some((n) => n.kind === "usage")) return;
        const seeded = [
          newNotice("usage", "Usage snapshot", `${usage.verifications} verifications on this project.`),
          newNotice("security", "Session", `${user?.email ?? "A user"} is signed in on this device.`),
          ...current,
        ];
        saveNotices(scope, seeded);
        setNotices(seeded);
      })
      .catch(() => undefined);
  }, [client, scope, user?.email]);

  function persist(next: Notice[]) {
    setNotices(next);
    saveNotices(scope, next);
  }

  return (
    <AdminChrome title="Notification center">
      <div className="mb-4 flex gap-2">
        <Button type="button" variant="secondary" onClick={() => persist(notices.map((n) => ({ ...n, read: true })))}>
          Mark all read
        </Button>
      </div>
      <Card>
        {notices.length === 0 ? (
          <EmptyState title="Inbox empty" description="Ticket opens and usage snapshots land here." />
        ) : (
          <ul className="space-y-3 text-sm">
            {notices.map((n) => (
              <li key={n.id} className="border-b border-[var(--otv-border)] pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {n.title} · {n.kind}
                  </span>
                  {!n.read && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => persist(notices.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}>
                      Mark read
                    </Button>
                  )}
                </div>
                <p className="mt-1 mb-0 text-[var(--otv-text-secondary)]">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminChrome>
  );
}
