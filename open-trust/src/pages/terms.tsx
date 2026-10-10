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

export default function TermsPage() {
  return (
    <Shell title="Terms of Use">
      <p>By using 3GGA you agree to the following. If you do not agree, do not use the console.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">Authorized testing only</h2>
      <p>Fire vectors only at wallets you own or are explicitly authorized to test. Every broadcast target must be allowlisted by linking the wallet or by the admin allowlist.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">Real funds, real chains</h2>
      <p>Drills broadcast REAL on-chain transactions on Base and Polygon mainnets. Gas is paid by the connected wallet and is non-refundable. The mempool-lure vector deliberately uses starved gas and may sit pending unconfirmed.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">No seed phrases, no custody</h2>
      <p>3GGA never asks for seed phrases or private keys and never takes custody. Anyone asking for them in our name is a scammer.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">Subscriber access</h2>
      <p>Subscriber accounts are read-only (runs + verification). Admin actions (firing, linking, settings, team management) require the admin session.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">Disclaimer</h2>
      <p>3GGA IS PROVIDED “AS IS” FOR CONTROLLED SECURITY DRILLS. IT IS NOT FINANCIAL ADVICE. Threat scores are heuristic signals, not guarantees. You are solely responsible for transactions you sign, gas spent, and compliance with applicable law. To the maximum extent permitted by law, the operators accept no liability for loss arising from use or misuse of this console.</p>
    </Shell>
  );
}
