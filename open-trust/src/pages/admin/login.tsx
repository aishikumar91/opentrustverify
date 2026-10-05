import { useState } from "react";
import { useRouter } from "next/router";
import { withBasePath } from "../../lib/basePath";

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
    <div className="flex min-h-screen items-center justify-center bg-[#0A0E14] text-[#ECEFF3]">
      <form onSubmit={onSubmit} className="w-full max-w-sm px-6">
        <h1
          className="mb-1 text-xl font-medium tracking-tight"
          style={{ fontFamily: "'Urbanist', sans-serif" }}
        >
          Admin console
        </h1>
        <p className="mb-8 text-sm text-[#6B7686]" style={{ fontFamily: "'Roboto', sans-serif" }}>
          Open Trust trigger access
        </p>

        <label className="text-xs text-[#6B7686]">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 mb-5 w-full border-0 border-b border-[#20242C] bg-transparent py-2 text-sm outline-none focus:border-[#E11D48]"
          autoComplete="username"
        />

        <label className="text-xs text-[#6B7686]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 mb-6 w-full border-0 border-b border-[#20242C] bg-transparent py-2 text-sm outline-none focus:border-[#E11D48]"
          autoComplete="current-password"
        />

        {error && <p className="mb-4 text-xs text-[#FF5C6C]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#E11D48] py-2.5 text-sm font-medium text-white transition hover:bg-[#F43F5E] disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
