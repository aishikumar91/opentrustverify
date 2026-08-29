import { Link, NavLink } from "react-router-dom";
import { Button, Logo } from "@otv/ui";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { to: "/docs", label: "Docs" },
  { to: "/whitepaper", label: "Whitepaper" },
  { to: "/about", label: "About" },
];

export function SiteHeader() {
  const { ready, user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--otv-border)] bg-[color-mix(in_srgb,var(--otv-background)_85%,transparent)] backdrop-blur">
      <div className="otv-container flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="OpenTrust Verify by POP Trust">
          <Logo href={false} />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm ${isActive ? "text-[var(--otv-text-primary)]" : "text-[var(--otv-text-secondary)] hover:text-[var(--otv-text-primary)]"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/verifier">
            <Button variant="ghost" type="button">
              Verifier
            </Button>
          </Link>
          {ready && user ? (
            <Link to="/dashboard">
              <Button type="button">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" type="button">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button type="button">Start building</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--otv-border)] py-10">
      <div className="otv-container flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <Link to="/" aria-label="OpenTrust Verify by POP Trust">
          <Logo href={false} />
        </Link>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-[var(--otv-text-secondary)]">
          <Link to="/docs">API docs</Link>
          <Link to="/whitepaper">Whitepaper</Link>
          <Link to="/security">Security</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
