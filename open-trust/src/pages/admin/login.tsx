import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { withBasePath } from "../../lib/basePath";
import BrandMark from "../../components/BrandMark";
import TurnstileWidget from "../../components/TurnstileWidget";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../lib/useTheme";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (siteKey && !captcha) {
      setError("Complete the captcha challenge.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(withBasePath("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstile: captcha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
      <main className="flex w-full flex-1 items-center justify-center px-4 pb-4">
        <div className="w-full max-w-sm border border-transparent bg-transparent p-1 sm:rounded-[24px] sm:border-[#DDE1EA] sm:bg-white sm:p-6">
          <BrandMark size="lg" as="h1" className="mb-1" />
          <p className="mb-4 text-sm text-[#6B7280]">Sign in</p>
          <form onSubmit={onSubmit}>
            <label className="block text-xs text-[#6B7280]">
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={inputCls} />
            </label>
            <label className="mt-4 block text-xs text-[#6B7280]">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={inputCls}
              />
            </label>
            <TurnstileWidget siteKey={siteKey} onToken={setCaptcha} />
            {error && <p className="mb-4 break-words text-xs text-[#D92D20]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 min-h-[44px] w-full rounded-full bg-[#D7FF00] py-2.5 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
      <nav className="mx-auto flex w-full max-w-sm flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-8 text-[11px] text-[#6B7280]">
        <a href={withBasePath("/subscriber/login")} className="hover:text-[#2E7CF6]">Subscriber sign-in</a>
        <a href={withBasePath("/subscriber/install")} className="hover:text-[#2E7CF6]">Install app</a>
        <a href={withBasePath("/privacy")} className="hover:text-[#2E7CF6]">Privacy</a>
        <a href={withBasePath("/terms")} className="hover:text-[#2E7CF6]">Terms</a>
      </nav>
    </div>
  );
}
