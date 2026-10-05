import Link from "next/link";
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
    <div className="min-h-screen bg-[#0A0E14] text-[#ECEFF3]" style={{ fontFamily: "'Roboto', sans-serif" }}>
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 md:px-8">
        <span className="text-lg font-medium tracking-tight" style={{ fontFamily: "'Urbanist', sans-serif" }}>
          Open Trust
        </span>
        <Link
          href="/admin/login"
          className="rounded-full border border-[#20242C] px-4 py-1.5 text-sm text-[#B9C4CE] transition hover:border-[#E11D48] hover:text-[#E11D48]"
        >
          Admin console
        </Link>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-3xl px-6 pb-20 pt-12 text-center md:px-8 md:pb-28 md:pt-20">
        <h1
          className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
          style={{ fontFamily: "'Urbanist', sans-serif" }}
        >
          Know if a transaction is real before it costs you.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-[#8A95A5] md:text-lg">
          Open Trust reads live on-chain data to catch mempool lures, address poisoning, and
          unverified tokens — in the seconds before you'd act on fake funds.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#explorer"
            className="rounded-full bg-[#E11D48] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#F43F5E]"
            style={{ fontFamily: "'Urbanist', sans-serif" }}
          >
            Verify a transaction
          </a>
        </div>
      </header>

      {/* Explorer */}
      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-8">
        <VerificationExplorer />
      </section>

      {/* How it works */}
      <section className="border-t border-[#171B22] bg-[#080B10]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8">
          <h2
            className="mb-12 text-center text-2xl font-semibold tracking-tight md:text-3xl"
            style={{ fontFamily: "'Urbanist', sans-serif" }}
          >
            How a verdict gets made
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="text-sm text-[#3A4150]" style={{ fontFamily: "'Urbanist', sans-serif" }}>
                  {s.n}
                </span>
                <h3 className="mt-2 text-base font-medium" style={{ fontFamily: "'Urbanist', sans-serif" }}>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-[#8A95A5]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-center text-xs text-[#3A4150] md:px-8">
        Open Trust · verdicts are produced from live chain data, not stored assumptions.
      </footer>
    </div>
  );
}
