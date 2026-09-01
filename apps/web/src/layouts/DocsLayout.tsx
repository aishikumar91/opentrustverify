import { Link, Outlet } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

const NAV = [
  ["introduction", "Overview"],
  ["first-request", "First request"],
  ["authentication", "Authentication"],
  ["statuses", "Statuses"],
  ["verification-api", "Verify a transfer"],
  ["verdicts", "Look up a verdict"],
  ["webhooks", "Webhooks"],
  ["keys-usage", "Keys and usage"],
  ["clients", "Client libraries"],
  ["errors", "Errors"],
] as const;

export function DocsLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 md:grid md:grid-cols-[240px_1fr]">
        <aside className="border-b border-[var(--otv-border)] bg-[var(--otv-surface-tint)] p-6 md:border-b-0 md:border-r">
          <p className="mb-4 hidden text-xs font-semibold tracking-[0.28em] text-[var(--otv-text-muted)] md:block">
            INTEGRATION
          </p>
          <nav className="space-y-1" aria-label="Docs">
            {NAV.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block rounded-[8px] px-3 py-2 text-sm font-semibold text-[var(--otv-text-secondary)] hover:bg-[var(--otv-brand)] hover:text-[var(--otv-ink)]"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-8 space-y-2 text-sm">
            <a className="block text-[var(--otv-brand)]" href={`${API_BASE}/api/docs`}>
              Interactive API
            </a>
            <Link to="/whitepaper" className="block text-[var(--otv-brand)]">
              How a check runs
            </Link>
          </div>
        </aside>
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}
