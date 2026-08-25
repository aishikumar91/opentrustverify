import { z } from "zod";

export const VERDICT_SCHEMA_ID = "otv.verdict.v1" as const;

export const VerificationStatus = z.enum([
  "OBSERVED",
  "PENDING",
  "EXECUTED",
  "ASSET_CONFIRMED",
  "BALANCE_CONFIRMED",
  "FINAL",
  "SPENDABLE",
  "REJECTED",
  "SUSPICIOUS",
  "UNVERIFIED",
]);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const EvidenceType = z.enum([
  "TRANSACTION_INCLUDED",
  "EXECUTION_SUCCESS",
  "ASSET_MATCH",
  "RECIPIENT_MATCH",
  "AMOUNT_MATCH",
  "BALANCE_DELTA",
  "FINALITY",
  "SPENDABILITY",
]);
export type EvidenceType = z.infer<typeof EvidenceType>;

export const EvidenceItemSchema = z.object({
  type: EvidenceType,
  result: z.boolean(),
  detail: z.string().optional(),
  observedAt: z.string().datetime().optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const AssetSchema = z.object({
  type: z.enum(["native", "erc20", "erc721", "erc1155", "other"]),
  contract: z.string().optional(),
  symbol: z.string().optional(),
  decimals: z.number().int().min(0).max(36).optional(),
  tokenId: z.string().optional(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const FinalitySchema = z.object({
  state: z.enum(["PENDING", "SAFE", "FINAL", "UNKNOWN"]),
  confirmations: z.number().int().nonnegative().optional(),
  required: z.number().int().nonnegative().optional(),
});
export type Finality = z.infer<typeof FinalitySchema>;

export const RiskSchema = z.object({
  level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  signals: z.array(
    z.object({
      code: z.string(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      message: z.string(),
    })
  ),
});
export type Risk = z.infer<typeof RiskSchema>;

export const VerdictSchema = z.object({
  schema: z.literal(VERDICT_SCHEMA_ID),
  verdictId: z.string().min(1),
  status: VerificationStatus,
  confidence: z.number().min(0).max(1),
  chain: z.string().min(1),
  network: z.string().min(1),
  transactionHash: z.string().min(1),
  recipient: z.string().min(1),
  asset: AssetSchema,
  amount: z.string().optional(),
  balanceDelta: z.string().optional(),
  finality: FinalitySchema,
  risk: RiskSchema,
  evidence: z.array(EvidenceItemSchema).min(1),
  policyVersion: z.string(),
  checkedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  verifier: z.literal("otv"),
  kid: z.string(),
  signature: z.string().optional(),
});
export type Verdict = z.infer<typeof VerdictSchema>;

export const IncomingClaimSchema = z.object({
  chain: z.string().min(1),
  network: z.string().min(1),
  transactionHash: z.string().min(1),
  recipient: z.string().min(1),
  asset: AssetSchema.optional(),
  expectedAmount: z.string().optional(),
});
export type IncomingClaim = z.infer<typeof IncomingClaimSchema>;

/** Happy-path ordered statuses (excluding terminal failures). */
export const HAPPY_PATH: VerificationStatus[] = [
  "OBSERVED",
  "PENDING",
  "EXECUTED",
  "ASSET_CONFIRMED",
  "BALANCE_CONFIRMED",
  "FINAL",
  "SPENDABLE",
];

const ALLOWED_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  OBSERVED: ["PENDING", "REJECTED"],
  PENDING: ["EXECUTED", "REJECTED"],
  EXECUTED: ["ASSET_CONFIRMED", "UNVERIFIED", "SUSPICIOUS", "REJECTED"],
  ASSET_CONFIRMED: ["BALANCE_CONFIRMED", "FINAL", "SUSPICIOUS", "UNVERIFIED"],
  BALANCE_CONFIRMED: ["FINAL", "SUSPICIOUS", "UNVERIFIED"],
  FINAL: ["SPENDABLE", "SUSPICIOUS", "UNVERIFIED"],
  SPENDABLE: [],
  REJECTED: [],
  SUSPICIOUS: [],
  UNVERIFIED: [],
};

export function canTransition(from: VerificationStatus, to: VerificationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: VerificationStatus, to: VerificationStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid verdict transition: ${from} → ${to}`);
  }
}

export function parseVerdict(data: unknown): Verdict {
  return VerdictSchema.parse(data);
}
