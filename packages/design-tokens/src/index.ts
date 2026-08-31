export const colors = {
  brand: "#1f1d0d",
  brandHover: "#3a3720",
  accent: "#f7ff62",
  accentWarm: "#ffd32b",
  background: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f6f6f6",
  border: "#d2d2d2",
  textPrimary: "#29281e",
  textSecondary: "#5c5a4e",
  textMuted: "#8a887c",
  success: "#198754",
  warning: "#e6b800",
  danger: "#dc3545",
  info: "#0d6efd",
  pending: "#e6b800",
  verified: "#198754",
  unverified: "#8a887c",
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
