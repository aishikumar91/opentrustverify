import { Logo } from "./Logo";

export function Navbar({ links = [] as { href: string; label: string }[], trailing }: { links?: { href: string; label: string }[]; trailing?: React.ReactNode }) {
  return (
    <header className="otv-header">
      <div className="otv-container flex items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-[var(--otv-text-secondary)] hover:text-[var(--otv-text-primary)]">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">{trailing}</div>
      </div>
    </header>
  );
}
