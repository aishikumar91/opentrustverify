export const colors = {
  brand: "#7cff3a",
  brandHover: "#68e028",
  accent: "#7cff3a",
  accentWarm: "#7cff3a",
  background: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f6f6f6",
  border: "#d2d2d2",
  textPrimary: "#111111",
  textSecondary: "#3d3d3d",
  textMuted: "#6b6b6b",
  success: "#7cff3a",
  warning: "#fd7e14",
  danger: "#dc3545",
  info: "#0d6efd",
  pending: "#3d7a2a",
  verified: "#3d7a2a",
  unverified: "#6b6b6b",
  suspicious: "#fd7e14",
} as const;

export const fonts = {
  logo: "var(--otv-font-logo)",
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
