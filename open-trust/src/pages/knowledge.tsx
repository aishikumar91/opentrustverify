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

const ROWS: [string, string][] = [
  ["Mempool lure", "Sends native coin with deliberately starved gas. Sits pending unconfirmed — the classic “incoming funds” lure."],
  ["Zero-value transfer", "Calls transfer(target, 0) on a real token (USDC, USDT, WETH, cbBTC, WBTC, WPOL or any contract). Emits a Transfer event with zero balance movement."],
  ["Address poisoning", "Calls emitPoisonedTransfer on your deployed 3GTT drill token — Transfer event, no balance delta."],
  ["Unverified token transfer", "Real transfer() against any ERC-20 contract you paste or deploy."],
];
const FAQ: [string, string][] = [
  ["What is a RUN?", "A RUN is one executed drill: BROADCAST (tx sent + recorded) → Verify (chain read + heuristics) → FRAUD_INTERCEPTED or VERIFIED_LEGITIMATE with a 0–100 threat score, reasons and a recommended action."],
  ["Why does my wallet never pop a confirmation?", "No signing session in this tab (reload clears it), a passkey-only link (cannot sign), or the wallet is on the wrong network. Reconnect in the admin console and match the Network selector."],
  ["Why does the lure never confirm on-chain?", "By design: starved maxFeePerGas keeps it pending so the verifier can observe it. Other vectors confirm normally."],
  ["Which coins can I test?", "Base: ETH, USDC, USDT, WETH, cbBTC. Polygon: POL, USDC, USDT, WETH, WBTC, WPOL. Native BTC is watch-only (balance display); test BTC behavior via cbBTC/WBTC. Any other ERC-20 via the Contract field."],
  ["Why was my target rejected?", "Targets (and signers) must be allowlisted: link the wallet or ask the admin. The dashboard pre-checks this before asking your wallet to sign, so no gas is wasted."],
  ["What does e.toLowerCase is not a function mean?", "A wallet answered the chain id in a non-standard format. Fixed: the console now normalizes numeric and hex answers. Refresh and retry."],
];
export default function KnowledgePage() {
  return (
    <Shell title="Knowledge · how RUNS work">
      <p>A RUN tracks one drill end-to-end. Fire it with your own wallet, record it, then verify it against live chain state.</p>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">The four vectors</h2>
      <ul className="space-y-2">
        {ROWS.map(([name, desc]) => (
          <li key={name} className="rounded-xl border border-[#DDE1EA] bg-white p-3">
            <p className="font-semibold text-[#101828]">{name}</p>
            <p className="mt-1">{desc}</p>
          </li>
        ))}
      </ul>
      <h2 className="pt-2 text-base font-semibold text-[#101828]">Questions</h2>
      <ul className="space-y-2">
        {FAQ.map(([q, a]) => (
          <li key={q} className="rounded-xl border border-[#DDE1EA] bg-white p-3">
            <p className="font-semibold text-[#101828]">{q}</p>
            <p className="mt-1">{a}</p>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
