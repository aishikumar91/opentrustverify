import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo, Sidebar } from "@otv/ui";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/verifications", label: "Verifications" },
  { href: "/dashboard/api", label: "API keys" },
  { href: "/dashboard/webhooks", label: "Webhooks" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/security", label: "Audit" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardLayout() {
  const loc = useLocation();
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={NAV}
        active={loc.pathname}
        renderLogo={(logo) => (
          <Link to="/" aria-label="OpenTrust Verify by POP Trust">
            {logo}
          </Link>
        )}
        renderLink={(item, className) => (
          <NavLink to={item.href} end={item.href === "/dashboard"} className={className}>
            {item.label}
          </NavLink>
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-[var(--otv-border)] px-4 md:px-6">
          <div className="md:hidden">
            <Link to="/" aria-label="OpenTrust Verify by POP Trust">
              <Logo href={false} />
            </Link>
          </div>
          <div className="hidden text-sm text-[var(--otv-text-secondary)] md:block">{user?.email}</div>
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-[var(--otv-text-secondary)]" to="/verifier">
              Verifier
            </Link>
            <button
              type="button"
              className="text-[var(--otv-text-secondary)] hover:text-[var(--otv-text-primary)]"
              onClick={() => void logout()}
            >
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        <nav className="flex border-t border-[var(--otv-border)] md:hidden" aria-label="Mobile">
          {NAV.slice(0, 4).map((n) => (
            <NavLink
              key={n.href}
              to={n.href}
              end={n.href === "/dashboard"}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-xs ${
                  isActive ? "text-[var(--otv-brand)]" : "text-[var(--otv-text-secondary)]"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
