/** Map EIP-1193 / WalletConnect failures to short UI errors. */

export function walletErrorMessage(err: unknown, fallback = "Wallet request failed."): string {
  const raw =
    err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "";
  const code =
    err && typeof err === "object" && "code" in err ? Number((err as { code: unknown }).code) : NaN;

  if (code === 4001 || /user rejected|denied|cancelled|canceled/i.test(raw)) {
    return "Rejected in wallet.";
  }
  if (code === 4902 || /unrecognized chain|unknown chain/i.test(raw)) {
    return "Switch wallet to the configured chain.";
  }
  if (code === -32003 || /out\s*of\s*funds/i.test(raw)) {
    return "Out of funds: the signer lacks native coin for gas + value on this network. Fund it or switch network.";
  }
  if (/is not a function|is not an object|undefined is not/i.test(raw)) {
    return "Unexpected wallet response. Reconnect the wallet and retry.";
  }
  if (/insufficient funds|gas/i.test(raw)) {
    return "Insufficient funds for gas.";
  }
  if (/nonce|already known|replacement/i.test(raw)) {
    return "Pending transaction conflict — retry.";
  }
  if (/network|fetch|timeout|disconnected/i.test(raw)) {
    return "Network error — retry.";
  }
  if (raw && raw.length <= 120) return raw;
  return fallback;
}
