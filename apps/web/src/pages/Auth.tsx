import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, BtnText, Button, Card, Input, buttonClassName } from "@otv/ui";
import { OtvApiError } from "@otv/api-client";
import { apiBase, createClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const HOSTED_ORIGIN = "https://otv.poptrust.me";

type SsoLink = { href: string; label: string; hosted: boolean };

function ssoLabel(provider?: string): string {
  return provider === "oidc" ? "Continue with SSO" : "Continue with Google";
}

function useAccountSso(returnTo: string): SsoLink | null {
  const [link, setLink] = useState<SsoLink | null>(null);

  useEffect(() => {
    let cancel = false;
    const base = apiBase();
    const localHref = `${base}/v1/auth/oidc/login?return_to=${encodeURIComponent(returnTo)}`;

    (async () => {
      try {
        const status = await createClient().oidcStatus();
        if (cancel) return;
        if (status.enabled) {
          setLink({ href: localHref, label: ssoLabel(status.provider), hosted: false });
          return;
        }
      } catch {
        if (cancel) return;
        if (base.startsWith(HOSTED_ORIGIN)) {
          setLink({ href: localHref, label: "Continue with Google", hosted: false });
          return;
        }
      }

      if (base.startsWith(HOSTED_ORIGIN)) {
        if (!cancel) setLink(null);
        return;
      }

      try {
        const res = await fetch(`${HOSTED_ORIGIN}/v1/auth/oidc/status`);
        const status = (await res.json()) as { enabled?: boolean; provider?: string };
        if (cancel) return;
        if (res.ok && status.enabled) {
          setLink({
            href: `${HOSTED_ORIGIN}/v1/auth/oidc/login?return_to=${encodeURIComponent(returnTo)}`,
            label: ssoLabel(status.provider),
            hosted: true,
          });
          return;
        }
      } catch {
        /* the connected API has no SSO, and the hosted status call failed */
      }
      if (!cancel) setLink(null);
    })();

    return () => {
      cancel = true;
    };
  }, [returnTo]);

  return link;
}

function GoogleSignIn({ returnTo }: { returnTo: string }) {
  const link = useAccountSso(returnTo);
  if (!link) return null;
  return (
    <div className="space-y-3">
      <a className={buttonClassName("secondary", "w-full no-underline")} href={link.href}>
        <BtnText>{link.label}</BtnText>
      </a>
      {link.hosted && (
        <p className="text-center text-xs text-[var(--otv-text-muted)]">
          Signs in on otv.poptrust.me.
        </p>
      )}
      <p className="text-center text-xs font-semibold tracking-[0.16em] text-[var(--otv-text-muted)]">OR</p>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    new URLSearchParams(location.search).get("sso") === "error" ? "SSO sign-in failed." : null
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof OtvApiError && err.status === 401
          ? "Invalid email or password."
          : err instanceof Error
            ? err.message
            : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card lift className="w-full max-w-md space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-[var(--otv-brand)]">ACCOUNT</p>
            <h1 className="mt-2 text-2xl font-bold">Log in</h1>
            <p className="mt-1 text-sm text-[var(--otv-text-secondary)]">
              Use the email you registered with. API keys stay in your backend, not in this form. A
              stored verdict can still be opened on the{" "}
              <Link className="text-[var(--otv-brand)]" to="/verifier">
                public verifier
              </Link>{" "}
              without an account.
            </p>
          </div>
          {error && (
            <Alert tone="danger" title="Could not sign in">
              {error}
            </Alert>
          )}
          <GoogleSignIn returnTo={from} />
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--otv-text-muted)]">Email</span>
              <Input className="otv-input-lg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--otv-text-muted)]">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Log in"}
            </Button>
          </form>
          <p className="text-sm text-[var(--otv-text-secondary)]">
            No account?{" "}
            <Link className="text-[var(--otv-brand)]" to="/register">
              Create one
            </Link>
          </p>
        </Card>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(email, password, name);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const taken = err instanceof OtvApiError && err.status === 409;
      setError(taken ? "That email is already registered." : err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card lift className="w-full max-w-md space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-[var(--otv-brand)]">NEW TEAM</p>
            <h1 className="mt-2 text-2xl font-bold">Create an account</h1>
            <p className="mt-1 text-sm text-[var(--otv-text-secondary)]">
              You get a workspace, a default project, and the free plan so you can mint a key. Put
              that key in your backend. Card billing is not live. Plan names beyond free exist in the
              product, without published prices.
            </p>
          </div>
          {error && (
            <Alert tone="danger" title="Could not create account">
              {error}
            </Alert>
          )}
          <GoogleSignIn returnTo="/dashboard" />
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--otv-text-muted)]">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--otv-text-muted)]">Email</span>
              <Input className="otv-input-lg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--otv-text-muted)]">Password, at least 8 characters</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-[var(--otv-text-secondary)]">
            Creating an account means you accept the{" "}
            <Link className="text-[var(--otv-brand)]" to="/terms">
              terms of use
            </Link>{" "}
            and the{" "}
            <Link className="text-[var(--otv-brand)]" to="/privacy">
              privacy policy
            </Link>
            .
          </p>
          <p className="text-sm text-[var(--otv-text-secondary)]">
            Already registered?{" "}
            <Link className="text-[var(--otv-brand)]" to="/login">
              Log in
            </Link>
          </p>
        </Card>
  );
}
