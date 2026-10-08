/**
 * Next.js does not prefix manual fetch()/href strings with basePath.
 * Use this helper for browser calls when hosted under /trigger.
 */
export function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  if (!path.startsWith("/")) return path;
  if (!base || path.startsWith(base + "/") || path === base) return path;
  return `${base}${path}`;
}
