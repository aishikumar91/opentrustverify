import Link from "next/link";
import BrandMark from "../components/BrandMark";
import VerificationExplorer from "../components/VerificationExplorer";

const STEPS = [
  {
    n: "01",
    title: "Transaction broadcasts",
    body: "A transfer, token movement, or contract call lands on-chain.",
  },
  {
    n: "02",
    title: "Engine reads live state",
    body: "Confirmation depth, gas pricing, event logs, and contract verification are pulled directly from the chain.",
  },
  {
    n: "03",
    title: "Verdict returned",
    body: "A threat score and plain-language reasons — fraud intercepted, or verified legitimate.",
  },
];

export default function Home() {
  return (
    <div className="font-ui min-h-screen overflow-x-hidden bg-[#0A0E14] text-[#ECEFF3]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_20%_0%,_rgba(225,29,72,0.22),_transparent_55%),radial-gradient(ellipse_at_80%_10%,_rgba(80,10,30,0.35),_transparent_50%)]" />

      <nav className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6 md:px-8">
        <BrandMark size="sm" />
        <Link
          href="/admin/login"
          className="shrink-0 rounded-full bg-[#E11D48] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#F43F5E]"
        >
          Admin console
        </Link>
      </nav>

      <header className="relative mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 pb-16 pt-10 text-center sm:px-6 md:px-8 md:pb-24">
        <BrandMark size="hero" as="h1" className="mb-6" />
        <p className="brand-fade-up max-w-xl text-base text-[#B9C4CE] sm:text-lg">
          Know if a transaction is real before it costs you.
        </p>
        <p className="brand-fade-up-delay mx-auto mt-4 max-w-lg text-sm text-[#6B7686]">
          3GGE reads live on-chain data to catch mempool lures, address poisoning, and
          unverified tokens — in the seconds before you&apos;d act on fake funds.
        </p>
        <div className="brand-fade-up-delay mt-10">
          <a
            href="#explorer"
            className="inline-flex rounded-full bg-[#E11D48] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#F43F5E]"
          >
            Verify a transaction
          </a>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-4 pb-20 sm:px-6 md:px-8 md:pb-24">
        <VerificationExplorer />
      </section>

      <section className="relative border-t border-[#171B22] bg-[#080B10]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:px-8 md:py-20">
          <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:mb-12 md:text-3xl">
            How a verdict gets made
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="text-sm text-[#3A4150]">{s.n}</span>
                <h3 className="mt-2 text-base font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-[#8A95A5]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative mx-auto max-w-5xl px-4 py-10 text-center text-xs text-[#3A4150] sm:px-6 md:px-8">
        3GGE · verdicts are produced from live chain data, not stored assumptions.
      </footer>
    </div>
  );
}
