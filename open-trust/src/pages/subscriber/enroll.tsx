import { useState } from "react";
import { withBasePath } from "../../lib/basePath";
import BrandMark from "../../components/BrandMark";
import PromoBadge from "../../components/PromoBadge";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../lib/useTheme";

const LTC_ADDRESS = "ltc1q8v6w8ut3dynmkfs2agg599jahgtr74d3y3epx6";

const TIERS: { price: string; term: string }[] = [
  { price: "$35", term: "6 Days" },
  { price: "$80", term: "12 Days" },
  { price: "$150", term: "24 Days" },
  { price: "$400", term: "Quarterly" },
  { price: "$750", term: "Bi-annually" },
];

export default function EnrollPage() {
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <div className="nui font-ui min-h-screen bg-[#E9EDF4] text-[#101828]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <BrandMark size="sm" />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-8">
        <PromoBadge />
        <h1 className="text-xl font-semibold text-[#101828]">Get Onboard</h1>
        <div className="grid items-stretch gap-4 sm:grid-cols-2">
          <section aria-label="Price list" className="rounded-[24px] border border-[#DDE1EA] bg-white p-5">
            <ul className="space-y-2">
              {TIERS.map((t) => (
                <li
                  key={t.price + t.term}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] px-4 py-3"
                >
                  <span className="tnum font-mono text-base font-semibold text-[#101828]">{t.price}</span>
                  <span className="text-xs text-[#5B6472]">for {t.term}</span>
                  <span className="rounded-full bg-[#D7FF00]/40 px-2 py-1 font-mono text-[11px] font-bold text-[#0B0F14]">
                    −30%
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label="Pay with Litecoin" className="flex flex-col rounded-[24px] border border-[#DDE1EA] bg-white p-5">
            <p className="break-all font-mono text-[11px] leading-relaxed text-[#101828]">
              LTC ADDRESS: {LTC_ADDRESS}
            </p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(LTC_ADDRESS).catch(() => {});
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-2 min-h-10 w-full rounded-full border border-[#CBD1DE] px-4 text-xs font-medium text-[#101828] transition hover:border-[#B8E600]"
            >
              {copied ? "Copied ✓" : "Copy LTC address"}
            </button>
            <img
              src={withBasePath("/ltc-qr.png")}
              alt="LTC payment QR code"
              width={600}
              height={600}
              className="mx-auto mt-3 h-auto w-full max-w-[240px] flex-1 rounded-2xl border border-[#CBD1DE] bg-white p-2 object-contain"
            />
          </section>
        </div>
        <a
          href={withBasePath("/subscriber/fulfillment")}
          className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#D7FF00] px-4 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600]"
        >
          I have paid
        </a>
        <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-[11px] text-[#6B7280]">
          <a href={withBasePath("/subscriber/login")} className="hover:text-[#2E7CF6]">Subscriber sign-in</a>
          <a href={withBasePath("/privacy")} className="hover:text-[#2E7CF6]">Privacy</a>
          <a href={withBasePath("/terms")} className="hover:text-[#2E7CF6]">Terms</a>
        </nav>
      </main>
    </div>
  );
}
