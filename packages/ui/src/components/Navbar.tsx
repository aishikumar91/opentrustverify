import { Logo } from "./Logo";

export function Navbar({ links = [] as { href: string; label: string }[], trailing }: { links?: { href: string; label: string }[]; trailing?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--otv-border)] bg-[color-mix(in_srgb,var(--otv-background)_85%,transparent)] backdrop-blur">
      <div className="otv-container flex h-16 items-center justify-between gap-4">
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
