export const colors = {
  brand: "#1e6bff",
  brandHover: "#3d82ff",
  background: "#050505",
  surface: "#0c0c0e",
  surfaceMuted: "#141418",
  border: "#26262c",
  textPrimary: "#f4f4f5",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#38bdf8",
  pending: "#f59e0b",
  verified: "#22c55e",
  unverified: "#a1a1aa",
  suspicious: "#f97316",
} as const;

export const fonts = {
  display: "var(--otv-font-display)",
  heading: "var(--otv-font-heading)",
  body: "var(--otv-font-body)",
  label: "var(--otv-font-label)",
  code: "var(--otv-font-code)",
  mono: "var(--otv-font-mono)",
} as const;

export const typeScale = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"] as const;

export const statusTokens = {
  OBSERVED: { color: colors.info, label: "Observed", icon: "eye" },
  PENDING: { color: colors.pending, label: "Pending", icon: "clock" },
  EXECUTED: { color: colors.info, label: "Executed", icon: "check" },
  ASSET_CONFIRMED: { color: colors.verified, label: "Asset confirmed", icon: "coin" },
  BALANCE_CONFIRMED: { color: colors.verified, label: "Balance confirmed", icon: "wallet" },
  FINAL: { color: colors.verified, label: "Final", icon: "shield" },
  SPENDABLE: { color: colors.success, label: "Spendable", icon: "verified" },
  REJECTED: { color: colors.danger, label: "Rejected", icon: "x" },
  SUSPICIOUS: { color: colors.suspicious, label: "Suspicious", icon: "alert" },
  UNVERIFIED: { color: colors.unverified, label: "Unverified", icon: "help" },
} as const;
