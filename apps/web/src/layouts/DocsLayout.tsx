import { Link, Outlet } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

const NAV = [
  ["introduction", "Introduction"],
  ["quickstart", "Quickstart"],
  ["authentication", "Authentication"],
  ["verification-api", "Verification API"],
  ["verdicts", "Verdicts"],
  ["webhooks", "Webhooks"],
  ["keys-usage", "Keys and usage"],
  ["sdks", "SDKs"],
  ["errors", "Errors"],
] as const;

export function DocsLayout() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="md:grid md:grid-cols-[240px_1fr]">
        <aside className="border-b border-[var(--otv-border)] p-4 md:border-b-0 md:border-r">
          <p className="mb-4 hidden text-xs tracking-[0.2em] text-[var(--otv-text-muted)] md:block">
            DEVELOPER DOCS
          </p>
          <nav className="space-y-1" aria-label="Docs">
            {NAV.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block rounded-lg px-2 py-1.5 text-sm text-[var(--otv-text-secondary)] hover:bg-[var(--otv-surface-muted)]"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-8 space-y-2 text-sm">
            <a className="block text-[var(--otv-brand)]" href={`${API_BASE}/api/docs`}>
              OpenAPI UI →
            </a>
            <Link to="/whitepaper" className="block text-[var(--otv-brand)]">
              Whitepaper →
            </Link>
          </div>
        </aside>
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}
