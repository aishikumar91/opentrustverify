export const colors = {
  brand: "#f3e4a8",
  brandHover: "#e7d48a",
  brandText: "#6e5310",
  accent: "#f3e4a8",
  accentWarm: "#f6e7b4",
  background: "#f3efe6",
  surface: "#fbf8f2",
  surfaceMuted: "#ebe6da",
  border: "#d8d1c3",
  textPrimary: "#14110e",
  textSecondary: "#3f3a34",
  textMuted: "#6f695f",
  ivory: "#f0ebc6",
  stage: "#120908",
  success: "#8a6b16",
  warning: "#fd7e14",
  danger: "#dc3545",
  info: "#0d6efd",
  pending: "#8a6b16",
  verified: "#6e5310",
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
