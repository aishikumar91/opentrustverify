import { clsx } from "clsx";
import { Logo } from "./Logo";

export function Sidebar({
  items,
  active,
}: {
  items: { href: string; label: string }[];
  active?: string;
}) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-[var(--otv-border)] bg-[var(--otv-surface)] p-4 md:block">
      <Logo className="mb-8" />
      <nav className="space-y-1" aria-label="Dashboard">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={clsx(
              "block rounded-[10px] px-3 py-2 text-sm",
              active === item.href
                ? "bg-[var(--otv-brand-muted)] text-[var(--otv-brand)]"
                : "text-[var(--otv-text-secondary)] hover:bg-[var(--otv-surface-muted)]"
            )}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
