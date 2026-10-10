import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { withBasePath } from "../../lib/basePath";
import BrandMark from "../../components/BrandMark";
import TurnstileWidget from "../../components/TurnstileWidget";
import ThemeToggle from "../../components/ThemeToggle";

import { useTheme } from "../../lib/useTheme";



export default function SubscriberLoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);


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

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (siteKey && !captcha) {
      setError("Complete the captcha challenge.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(withBasePath("/api/staff/request-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstile: captcha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSent(true);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(withBasePath("/api/staff/verify-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid code");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "mt-2 min-h-[44px] w-full min-w-0 rounded-full border border-[#CBD1DE] bg-[#FFFFFF] px-4 text-sm text-[#101828] outline-none placeholder:text-[#AEB4C2] focus:border-[#B8E600]";

  return (
    <div className="nui font-ui relative flex min-h-screen flex-col bg-[#E9EDF4] text-[#101828]">
      <header className="flex items-center justify-end gap-3 px-4 py-3">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-4">
        <div className="border border-transparent bg-transparent p-1 sm:rounded-[24px] sm:border-[#DDE1EA] sm:bg-white sm:p-6">
          <BrandMark size="lg" as="h1" className="mb-1" />
          <p className="mb-4 text-sm text-[#6B7280]">Subscriber sign-in · email code</p>
          {step === "email" ? (
            <form onSubmit={requestCode}>
              <label className="block text-xs text-[#6B7280]">
                Work email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputCls} />
              </label>
              <TurnstileWidget siteKey={siteKey} onToken={setCaptcha} />
              {error && <p className="mb-4 break-words text-xs text-[#D92D20]">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="mt-2 min-h-[44px] w-full rounded-full bg-[#D7FF00] py-2.5 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send code"}
              </button>
              <a
                href={withBasePath("/subscriber/enroll")}
                className="mt-3 block text-center text-xs font-medium tracking-[0.2em] text-[#5B6472] hover:text-[#0B0F14]"
              >
                ENROLL
              </a>
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <p className="mb-4 break-words text-xs text-[#6B7280]">
                {sent ? `Code sent to ${email.trim()} (also check spam).` : "Enter the code from your email."}
              </p>
              <label className="block text-xs text-[#6B7280]">
                6-digit code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className={`${inputCls} text-center font-mono text-lg tracking-[0.3em]`}
                />
              </label>
              {error && <p className="mb-4 break-words text-xs text-[#D92D20]">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.trim().length < 6}
                className="mt-2 min-h-[44px] w-full rounded-full bg-[#D7FF00] py-2.5 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="mt-3 min-h-[40px] w-full text-xs text-[#6B7280] hover:text-[#101828]"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
      </main>
      <nav className="mx-auto flex w-full max-w-sm flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-8 text-[11px] text-[#6B7280]">
        <a href={withBasePath("/subscriber/install")} className="hover:text-[#2E7CF6]">Install app</a>
        <a href={withBasePath("/privacy")} className="hover:text-[#2E7CF6]">Privacy</a>
        <a href={withBasePath("/terms")} className="hover:text-[#2E7CF6]">Terms</a>
      </nav>
    </div>
  );
}
