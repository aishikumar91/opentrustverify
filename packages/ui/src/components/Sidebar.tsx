import { clsx } from "clsx";
import { Fragment, type ReactNode } from "react";
import { Logo } from "./Logo";

export type SidebarItem = { href: string; label: string };

export function Sidebar({
  items,
  active,
  renderLink,
  renderLogo,
}: {
  items: SidebarItem[];
  active?: string;
  renderLink?: (item: SidebarItem, className: string) => ReactNode;
  renderLogo?: (logo: ReactNode) => ReactNode;
}) {
  const logo = <Logo href={false} />;
  return (
    <aside className="sticky top-0 hidden min-h-screen w-60 shrink-0 self-start border-r border-[var(--otv-border)] bg-[var(--otv-surface)] p-6 md:block">
      {renderLogo ? renderLogo(logo) : <div className="mb-8">{logo}</div>}
      <nav className="space-y-1" aria-label="Dashboard">
        {items.map((item) => {
          const className = clsx(
            "block rounded-[8px] px-3 py-2 text-sm font-medium",
            active === item.href
              ? "bg-[var(--otv-brand-muted)] text-[var(--otv-brand)]"
              : "text-[var(--otv-text-secondary)] hover:bg-[var(--otv-surface-muted)]"
          );
          if (renderLink) {
            return <Fragment key={item.href}>{renderLink(item, className)}</Fragment>;
          }
          return (
            <a key={item.href} href={item.href} className={className}>
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
