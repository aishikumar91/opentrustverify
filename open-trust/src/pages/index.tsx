import BrandMark from "../components/BrandMark";
import VerificationExplorer from "../components/VerificationExplorer";

export default function Home() {
  return (
    <div className="font-ui min-h-screen overflow-x-hidden bg-[#0A0E14] text-[#ECEFF3]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_20%_0%,_rgba(225,29,72,0.22),_transparent_55%),radial-gradient(ellipse_at_80%_10%,_rgba(80,10,30,0.35),_transparent_50%)]" />

      <nav className="relative mx-auto flex max-w-5xl items-center px-4 py-5 sm:px-6 md:px-8">
        <BrandMark size="sm" />
      </nav>

      <header className="relative mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 pb-16 pt-10 text-center sm:px-6 md:px-8 md:pb-24">
        <BrandMark size="hero" as="h1" className="mb-4" />
        <div className="brand-fade-up-delay mt-4">
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

      <footer className="relative mx-auto max-w-5xl px-4 py-4 text-center font-caption text-[11px] text-[#3A4150]">
        3GGA
      </footer>
    </div>
  );
}
