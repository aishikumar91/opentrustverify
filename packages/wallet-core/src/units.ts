/** Format an integer base-unit string. Never uses Number(), so large balances stay exact. */
export function formatBaseUnits(amount: string, decimals: number): string {
  if (!/^\d+$/.test(amount)) return "—";
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return "—";
  const padded = amount.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function addBaseUnits(left: string, right: string): string | null {
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) return null;
  return (BigInt(left) + BigInt(right)).toString();
}

export function subBaseUnits(left: string, right: string): string | null {
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) return null;
  const delta = BigInt(left) - BigInt(right);
  if (delta < 0n) return null;
  return delta.toString();
}
