import { Link, Outlet } from "react-router-dom";
import { apiBase } from "@/lib/api";
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
  ["mistakes", "Common mistakes"],
  ["errors", "Errors"],
] as const;

export function DocsLayout() {
  return (
    <div className="otv-shell flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 md:grid md:grid-cols-[minmax(220px,280px)_1fr]">
        <aside className="otv-docs-nav">
          <p className="mb-4 hidden text-xs font-semibold tracking-[0.28em] text-[var(--otv-text-muted)] md:block">
            INTEGRATION
          </p>
          <nav className="space-y-1" aria-label="Docs">
            {NAV.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block px-3 py-2 text-[13px] font-medium tracking-wide text-[var(--otv-text-secondary)] hover:bg-[var(--otv-brand-muted)] hover:text-[var(--otv-text-primary)]"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-8 space-y-2 text-sm">
            <a className="block text-[var(--otv-brand)]" href={`${apiBase()}/api/docs`}>
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
