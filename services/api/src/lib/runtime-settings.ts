const boot = (process.env.OTV_PUBLIC_URL ?? "https://otv.poptrust.me").replace(/\/$/, "");
let publicUrl = boot;

export function getPublicUrl(): string {
  return publicUrl;
}

export function setPublicUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    const err = new Error("invalid_public_url") as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    const err = new Error("invalid_public_url") as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  if (parsed.username || parsed.password) {
    const err = new Error("invalid_public_url") as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
  publicUrl = `${parsed.origin}${path}`;
  return publicUrl;
}
