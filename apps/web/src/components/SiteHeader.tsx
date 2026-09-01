import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo, buttonClassName, BtnText } from "@otv/ui";
import { product } from "@otv/config";
import { useAuth } from "@/lib/auth";
import { GithubStar } from "@/components/GithubStar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/docs", label: "Docs" },
  { to: "/whitepaper", label: "Whitepaper" },
  { to: "/verifier", label: "Verifier" },
];

const FOOTER_LINKS = [
  { title: "Product", items: [
    { to: "/features", label: "Features" },
    { to: "/docs", label: "Docs" },
    { to: "/verifier", label: "Verifier" },
    { to: "/whitepaper", label: "Whitepaper" },
  ]},
  { title: "Company", items: [
    { to: "/about", label: "About" },
    { to: "/security", label: "Security" },
    { to: "/contact", label: "Contact" },
  ]},
  { title: "Legal", items: [
    { to: "/privacy", label: "Privacy policy" },
    { to: "/terms", label: "Terms of use" },
  ]},
];

function navClass({ isActive }: { isActive: boolean }) {
  return `otv-nav-link ${isActive ? "is-active" : ""}`;
}

function BrandLink({ invert = false }: { invert?: boolean }) {
  return (
    <Link to="/" aria-label="OpenTrust Verify by POP Trust">
      <Logo href={false} invert={invert} />
    </Link>
  );
}

export function SiteHeader() {
  const { ready, user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const onLogin = pathname === "/login";
  const onRegister = pathname === "/register";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="otv-header">
      <div className="otv-container grid grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <BrandLink />
        <nav className="hidden items-center justify-center gap-8 lg:flex" aria-label="Primary">
          {NAV.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              {l.label}
            </NavLink>
          ))}
          {ready && user && (
            <NavLink to="/dashboard" className={navClass}>
              Dashboard
            </NavLink>
          )}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <ThemeSwitcher />
          <span className="hidden sm:inline-flex">
            <GithubStar />
          </span>
          <button
            type="button"
            className={buttonClassName("ghost", "lg:hidden", "sm")}
            aria-expanded={open}
            aria-controls="site-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
          {ready && user ? (
            <Link to="/dashboard" className={buttonClassName("primary", undefined, "sm")}>
              <BtnText>Dashboard</BtnText>
            </Link>
          ) : (
            <>
              {!onLogin && (
                <Link to="/login" className={buttonClassName("secondary", "hidden sm:inline-flex", "sm")}>
                  <BtnText>Log in</BtnText>
                </Link>
              )}
              {!onRegister && (
                <Link to="/register" className={buttonClassName("primary", undefined, "sm")}>
                  <BtnText>Sign up</BtnText>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
      {open && (
        <nav
          id="site-mobile-nav"
          className="mt-4 border-t border-[var(--otv-border)] lg:hidden"
          aria-label="Primary"
        >
          <div className="otv-container flex flex-col gap-1 py-3">
            {NAV.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-[8px] px-3 py-2 text-sm font-semibold ${
                    isActive
                      ? "bg-[var(--otv-brand)] text-[var(--otv-ink)]"
                      : "text-[var(--otv-text-secondary)]"
                  }`
                }
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            {user && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `rounded-[8px] px-3 py-2 text-sm font-semibold ${
                    isActive
                      ? "bg-[var(--otv-brand)] text-[var(--otv-ink)]"
                      : "text-[var(--otv-text-secondary)]"
                  }`
                }
                onClick={() => setOpen(false)}
              >
                Dashboard
              </NavLink>
            )}
            {!user && !onLogin && (
              <Link
                to="/login"
                className="rounded-[8px] px-3 py-2 text-sm font-semibold text-[var(--otv-text-secondary)] sm:hidden"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
            )}
            <div className="px-3 py-2 sm:hidden">
              <GithubStar />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { user } = useAuth();
  return (
    <footer className="otv-footer">
      <div className="otv-container grid gap-12 py-20 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <BrandLink invert />
          <p className="mt-6 max-w-sm text-sm">
            A signed answer to one question: can this recipient spend what just arrived?
          </p>
          <div className="mt-6">
            <GithubStar invert />
          </div>
        </div>
        {FOOTER_LINKS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-4 text-lg font-bold text-[var(--otv-on-dark)]">{col.title}</h3>
            <ul className="space-y-2 text-sm text-[var(--otv-on-dark)]">
              {col.items.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
              {col.title === "Product" && user && (
                <li>
                  <Link to="/dashboard">Dashboard</Link>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--otv-inverse-muted)] py-5 text-center text-sm">
        {product.name} · a product of {product.legalEntity} · RC {product.rcNumber} ·{" "}
        <Link to="/privacy">Privacy</Link>
        {" · "}
        <Link to="/terms">Terms</Link>
      </div>
    </footer>
  );
}

export { BrandLink };
