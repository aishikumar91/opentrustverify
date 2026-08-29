import { Link, Outlet } from "react-router-dom";
import { Logo } from "@otv/ui";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--otv-border)]">
        <div className="otv-container flex h-16 items-center">
          <Link to="/" aria-label="OpenTrust Verify by POP Trust">
            <Logo href={false} />
          </Link>
        </div>
      </header>
      <main className="otv-container flex flex-1 items-center justify-center py-16">
        <Outlet />
      </main>
    </div>
  );
}
