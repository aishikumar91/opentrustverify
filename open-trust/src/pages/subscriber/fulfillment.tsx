import { useEffect, useState } from "react";
import { withBasePath } from "../../lib/basePath";
import BrandMark from "../../components/BrandMark";
import ActionStatus, { type ActionTone } from "../../components/ActionStatus";
import TurnstileWidget from "../../components/TurnstileWidget";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../lib/useTheme";

const PLANS = [
  { id: "35-6days", label: "$35 for 6 Days" },
  { id: "80-12days", label: "$80 for 12 Days" },
  { id: "150-24days", label: "$150 for 24 Days" },
  { id: "400-quarterly", label: "$400 Quarterly" },
  { id: "750-biannually", label: "$750 Bi-annually" },
] as const;
type PlanId = (typeof PLANS)[number]["id"];

export default function FulfillmentPage() {
  const { theme, toggleTheme } = useTheme();
  const [plan, setPlan] = useState<PlanId>("35-6days");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [txnHash, setTxnHash] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    function sync() {
      try {
        setCanInstall(
          Boolean(
            (window as unknown as { __pwaInstallEvent?: unknown }).__pwaInstallEvent
          )
        );
      } catch {}
    }
    sync();
    window.addEventListener("pwa-install-ready", sync);
    return () => window.removeEventListener("pwa-install-ready", sync);
  }, []);

  async function onInstall() {
    const ev = (
      window as unknown as { __pwaInstallEvent?: { prompt: () => Promise<void> } }
    ).__pwaInstallEvent;
    if (ev) {
      try {
        await ev.prompt();
        return;
      } catch {}
    }
    window.location.assign(withBasePath("/subscriber/install"));
  }
  const [status, setStatus] = useState<{ tone: ActionTone; title: string; detail?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(withBasePath("/api/config/public"))
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (typeof data.turnstileSiteKey === "string") setSiteKey(data.turnstileSiteKey);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (siteKey && !captcha) {
      setStatus({ tone: "warn", title: "Captcha required", detail: "Complete the captcha challenge, then submit." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(withBasePath("/api/fulfillment/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), telegram: telegram.trim(), txnHash: txnHash.trim(), plan, turnstile: captcha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setStatus({ tone: "ok", title: "Payment details received", detail: `Submission #${data.id} — onboarding follows by email.` });
      setTxnHash("");
    } catch (err) {
      setStatus({ tone: "fail", title: "Submit failed", detail: err instanceof Error ? err.message : "Try again." });
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "min-h-[44px] w-full min-w-0 rounded-full border border-[#CBD1DE] bg-[#FFFFFF] px-4 text-sm text-[#101828] outline-none placeholder:text-[#AEB4C2] focus:border-[#B8E600]";
  return (
    <div className="nui font-ui min-h-screen bg-[#E9EDF4] text-[#101828]">
      <header className="mx-auto flex w-full max-w-md items-center justify-end gap-3 px-4 py-3">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <main className="mx-auto w-full max-w-md px-4 pb-8">
        <BrandMark size="md" as="h1" className="mb-1" />
        <p className="mb-5 text-sm text-[#5B6472]">Subscriber fulfillment · payment onboarding</p>
        <form onSubmit={onSubmit} className="space-y-3 rounded-[24px] border border-[#DDE1EA] bg-white p-4">
          <label className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Plan
            <div className="mt-2 flex flex-wrap gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`min-h-10 rounded-full border px-3 text-[11px] transition ${
                    plan === p.id
                      ? "border-[#B8E600] bg-[#D7FF00] font-semibold text-[#0B0F14]"
                      : "border-[#CBD1DE] text-[#5B6472] hover:border-[#B8E600] hover:text-[#0B0F14]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" autoComplete="email" className={inputCls} />
          <input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="Telegram username (without @)" autoComplete="off" spellCheck={false} className={inputCls} />
          <input value={txnHash} onChange={(e) => setTxnHash(e.target.value)} placeholder="Payment TXN hash (64 hex)" autoComplete="off" spellCheck={false} className={`${inputCls} font-mono`} />
          <TurnstileWidget siteKey={siteKey} onToken={setCaptcha} />
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] w-full rounded-full bg-[#D7FF00] py-2.5 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit for onboarding"}
          </button>
          <button
            type="button"
            onClick={() => void onInstall()}
            title={canInstall ? "Install 3GGA now" : "Open install options for your device"}
            className="min-h-[44px] w-full rounded-full border border-[#CBD1DE] px-4 text-sm font-medium transition hover:border-[#B8E600]"
          >
            Install app{canInstall ? "" : " · options"}
          </button>
        </form>
        {status && (
          <div className="mt-3">
            <ActionStatus tone={status.tone} title={status.title} detail={status.detail} onClose={() => setStatus(null)} />
          </div>
        )}
        <nav className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-6 text-[11px] text-[#6B7280]">
          <a href={withBasePath("/subscriber/login")} className="hover:text-[#2E7CF6]">Subscriber sign-in</a>
          <a href={withBasePath("/knowledge")} className="hover:text-[#2E7CF6]">Knowledge</a>
          <a href={withBasePath("/privacy")} className="hover:text-[#2E7CF6]">Privacy</a>
          <a href={withBasePath("/terms")} className="hover:text-[#2E7CF6]">Terms</a>
        </nav>
      </main>
    </div>
  );
}
