/**
 * Feature flags (single reader for NEXT_PUBLIC_NEW_UI).
 * New banking UI is ON unless explicitly disabled with NEXT_PUBLIC_NEW_UI=0.
 * Baked at build time (NEXT_PUBLIC_*); rebuild trigger to change.
 */
export function isNewUI(): boolean {
  const raw = process.env.NEXT_PUBLIC_NEW_UI;
  if (raw === undefined || raw === null || raw === "") return true;
  const v = String(raw).trim().toLowerCase();
  return !(v === "0" || v === "false" || v === "no" || v === "off");
}
