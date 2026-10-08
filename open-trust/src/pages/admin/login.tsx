import { useState } from "react";
import { useRouter } from "next/router";
import { withBasePath } from "../../lib/basePath";
import BrandMark from "../../components/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(withBasePath("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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

  return (
    <div className="font-ui relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#0A0E14] px-3.5 text-[#ECEFF3] sm:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(225,29,72,0.16),_transparent_55%)]" />
      <form onSubmit={onSubmit} className="relative w-full max-w-sm min-w-0">
        <BrandMark size="lg" as="h1" className="mb-3" />
        <p className="brand-fade-up mb-4 font-caption text-sm text-[#8A95A5]">Sign in</p>

        <label className="text-xs text-[#6B7686]">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-5 mt-1 min-h-[44px] w-full min-w-0 border-0 border-b border-[#20242C] bg-transparent py-2.5 text-sm outline-none focus:border-[#E11D48]"
          autoComplete="username"
        />

        <label className="text-xs text-[#6B7686]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 mt-1 min-h-[44px] w-full min-w-0 border-0 border-b border-[#20242C] bg-transparent py-2.5 text-sm outline-none focus:border-[#E11D48]"
          autoComplete="current-password"
        />

        {error && <p className="mb-4 break-words text-xs text-[#FF5C6C]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] w-full rounded-full bg-[#E11D48] py-2.5 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
