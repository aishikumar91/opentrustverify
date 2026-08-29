import { Link, Outlet, useLocation } from "react-router-dom";
import { Logo } from "@otv/ui";
import { useAuth } from "@/lib/auth";

function labelFor(pathname: string): string {
  if (pathname.startsWith("/wallet")) return "WALLET PROFILE";
  return "PUBLIC VERIFIER";
}

export function ToolLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isWallet = pathname.startsWith("/wallet");
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--otv-border)]">
        <div className="otv-container flex h-16 items-center justify-between">
          <Link to="/" aria-label="OpenTrust Verify by POP Trust">
            <Logo href={false} />
          </Link>
          <div className="flex items-center gap-3">
            {isWallet ? (
              <Link to="/verifier" className="text-sm text-[var(--otv-text-secondary)]">
                Verifier
              </Link>
            ) : (
              <Link to="/docs" className="text-sm text-[var(--otv-text-secondary)]">
                Docs
              </Link>
            )}
            <Link
              to={user ? "/dashboard" : "/login"}
              className="text-sm text-[var(--otv-text-secondary)]"
            >
              {user ? "Dashboard" : "Log in"}
            </Link>
            <span className="text-xs tracking-widest text-[var(--otv-text-muted)]">
              {labelFor(pathname)}
            </span>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
