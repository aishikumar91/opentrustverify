import BrandMark from "../components/BrandMark";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../lib/useTheme";
import { withBasePath } from "../lib/basePath";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="nui font-ui min-h-screen bg-[#E9EDF4] text-[#101828]">
      <nav className="nui-legal-nav mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5">
        <a href={withBasePath("/")} aria-label="3GGA home">
          <BrandMark size="sm" />
        </a>
        <div className="flex items-center gap-4 text-xs">
          <a href={withBasePath("/privacy")} className="text-[#5B6472] hover:text-[#2E7CF6]">Privacy</a>
          <a href={withBasePath("/terms")} className="text-[#5B6472] hover:text-[#2E7CF6]">Terms</a>
          <a href={withBasePath("/knowledge")} className="text-[#5B6472] hover:text-[#2E7CF6]">Knowledge</a>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </nav>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <h1 className="text-2xl font-semibold text-[#101828]">{title}</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#374151]">{children}</div>
      </main>
      <footer className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-4 gap-y-1 px-4 pb-8 text-[11px] text-[#8A8D93]">
        <span>3GGA · last updated October 2026</span>
      </footer>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <Shell title="Privacy Policy">
      <p>3GGA is an admin-controlled fraud-drill console. This policy explains what we store and why.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">What we store</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Wallet addresses you link (allowlist + drill targets) and executed drill runs (hashes, vectors, verdicts).</li>
        <li>Subscriber email addresses added by the admin, plus one-time-code hashes used only for sign-in.</li>
        <li>Session cookies (admin 8h, subscriber 12h, HttpOnly, SameSite Strict) — no tracking cookies, no ads, no analytics beacons.</li>
      </ul>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">What we never store</h2>
      <p>Private keys, seed phrases and wallet passwords never touch our servers. All signing happens in your own wallet.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">Mail</h2>
      <p>Sign-in codes are emailed once per request via the configured SMTP provider. Mail includes an unsubscribe contact link; replying is not monitored — contact the admin directly.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">Your rights</h2>
      <p>Ask the admin to view, correct or delete your subscriber record or linked wallet at any time.</p>
    </Shell>
  );
}
