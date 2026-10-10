/** Cloudflare Turnstile: enforced only when a secret is configured. */
export function turnstileSiteKey(): string {
  return (process.env.TURNSTILE_SITE_KEY ?? "").trim();
}
export async function verifyTurnstile(token: unknown, ip?: string): Promise<{ ok: boolean; error?: string }> {
  const secret = (process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (!secret) return { ok: true };
  if (typeof token !== "string" || !token) return { ok: false, error: "Complete the captcha challenge." };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v1/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    if (data?.success) return { ok: true };
    return { ok: false, error: "Captcha check failed. Retry." };
  } catch {
    return { ok: false, error: "Captcha service unavailable. Retry." };
  }
}
