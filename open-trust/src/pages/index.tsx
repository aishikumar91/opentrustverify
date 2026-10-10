import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import BrandMark from "../components/BrandMark";
import { withBasePath } from "../lib/basePath";
import VerificationExplorer from "../components/VerificationExplorer";

export default function Home() {
  const [installLabel, setInstallLabel] = useState("Install app");
  useEffect(() => {
    try {
      const ua = navigator.userAgent || "";
      if (/iPad|iPhone|iPod/.test(ua)) setInstallLabel("Install on iPhone");
      else if (/Android/.test(ua)) setInstallLabel("Install on Android");
      else setInstallLabel("Install on Desktop");
    } catch {}
  }, []);
  useEffect(() => {
    document.body.classList.add("nui-on");
    return () => {
      document.body.classList.remove("nui-on");
    };
  }, []);
  async function onInstall() {
    try {
      const ev = (
        window as unknown as { __pwaInstallEvent?: { prompt: () => Promise<void> } }
      ).__pwaInstallEvent;
      if (ev) {
        await ev.prompt();
        return;
      }
    } catch {}
    window.location.assign(withBasePath("/subscriber/install"));
  }
  return (
    <div className="font-ui min-h-screen overflow-x-hidden bg-[#0A0E14] text-[#ECEFF3]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_20%_0%,_rgba(183,230,0,0.10),_transparent_55%),radial-gradient(ellipse_at_80%_10%,_rgba(46,124,246,0.14),_transparent_50%)]" />

      <nav className="relative mx-auto flex max-w-5xl items-center px-4 py-5 sm:px-6 md:px-8">
        <BrandMark size="sm" />
      </nav>

      <header className="landing-dots relative mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 pb-16 pt-10 text-center sm:px-6 md:px-8 md:pb-24">
        <BrandMark size="hero" as="h1" className="mb-4" />
        <div className="brand-fade-up-delay mt-4 flex flex-col items-center gap-3">
          <a
            href="#explorer"
            className="inline-flex rounded-full bg-[#D7FF00] px-7 py-3 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600]"
          >
            Verify a transaction
          </a>
          <button
            type="button"
            onClick={() => void onInstall()}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-3 text-sm font-medium text-white transition hover:border-[#D7FF00] hover:text-[#D7FF00]"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
            {installLabel}
          </button>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-4 pb-20 sm:px-6 md:px-8 md:pb-24">
        <VerificationExplorer />
      </section>

      <footer className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-4 text-center font-roboto text-[11px] text-[#3A4150]">
        <span>3GGA</span>
        <a href={withBasePath("/privacy")} className="hover:text-[#D7FF00]">Privacy</a>
        <a href={withBasePath("/terms")} className="hover:text-[#D7FF00]">Terms</a>
        <a href={withBasePath("/knowledge")} className="hover:text-[#D7FF00]">Knowledge</a>
      </footer>
    </div>
  );
}
