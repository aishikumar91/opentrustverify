import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo, Sidebar, buttonClassName } from "@otv/ui";
import { useAuth } from "@/lib/auth";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/verifications", label: "Verifications" },
  { href: "/dashboard/api", label: "API keys" },
  { href: "/dashboard/webhooks", label: "Webhooks" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/security", label: "Audit" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/admin", label: "Admin" },
];

export function DashboardLayout() {
  const loc = useLocation();
  const { user, logout } = useAuth();
  const active = loc.pathname.startsWith("/dashboard/admin") ? "/dashboard/admin" : loc.pathname;
  return (
    <div className="flex min-h-screen bg-[var(--otv-surface-tint)]">
      <Sidebar
        items={NAV}
        active={active}
        renderLogo={(logo) => (
          <Link to="/" className="mb-8 block" aria-label="OpenTrust Verify by POP Trust">
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
        <header className="otv-dash-header">
          <div className="md:hidden">
            <Link to="/" aria-label="OpenTrust Verify by POP Trust">
              <Logo href={false} />
            </Link>
          </div>
          <div className="truncate text-sm text-[var(--otv-text-secondary)]">{user?.email}</div>
          <div className="flex h-11 shrink-0 items-center gap-1">
            <ThemeSwitcher compact />
            <Link to="/verifier" className={buttonClassName("ghost")}>
              Verifier
            </Link>
            <button type="button" className={buttonClassName("ghost")} onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
        <nav
          className="flex overflow-x-auto border-t border-[var(--otv-border)] bg-[var(--otv-surface)] md:hidden"
          aria-label="Dashboard"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.href}
              to={n.href}
              end={n.href === "/dashboard"}
              className={({ isActive }) =>
                `flex h-12 shrink-0 items-center px-3 text-center text-xs font-semibold ${
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
