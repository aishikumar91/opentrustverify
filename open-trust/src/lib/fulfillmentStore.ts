/**
 * Subscriber fulfillment submissions (payment onboarding queue).
 */
import { query } from "./db";

export type FulfillmentPlan = "35-6days" | "80-12days" | "150-24days" | "400-quarterly" | "750-biannually";
export const FULFILLMENT_PLANS: { id: FulfillmentPlan; label: string }[] = [
  { id: "35-6days", label: "$35 for 6 Days" },
  { id: "80-12days", label: "$80 for 12 Days" },
  { id: "150-24days", label: "$150 for 24 Days" },
  { id: "400-quarterly", label: "$400 Quarterly" },
  { id: "750-biannually", label: "$750 Bi-annually" },
];

export type FulfillmentRow = {
  id: number;
  email: string;
  telegram: string;
  txn_hash: string;
  plan: string;
  status: string;
  created_at: string;
};

let schemaReady: Promise<void> | null = null;

export async function ensureFulfillmentSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS fulfillment_submissions (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          telegram TEXT NOT NULL,
          txn_hash TEXT NOT NULL,
          plan TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS fulfillment_status_idx ON fulfillment_submissions (status, created_at DESC);
      `);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

export function normalizeTelegram(raw: unknown): string {
  const t = String(raw ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{5,32}$/.test(t)) throw new Error("Provide a valid Telegram username (5–32 chars, letters/numbers/_).");
  return t;
}

export function normalizeTxnHash(raw: unknown): string {
  const h = String(raw ?? "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(h) && !/^[0-9a-fA-F]{64}$/.test(h)) {
    throw new Error("Provide a valid transaction hash (64 hex chars).");
  }
  return h;
}

export async function submitFulfillment(input: {
  email: string;
  telegram: string;
  txnHash: string;
  plan: string;
}): Promise<FulfillmentRow> {
  await ensureFulfillmentSchema();
  if (!FULFILLMENT_PLANS.some((p) => p.id === input.plan)) throw new Error("Choose a plan.");
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Provide a valid email address.");
  const result = await query<FulfillmentRow>(
    `INSERT INTO fulfillment_submissions (email, telegram, txn_hash, plan, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id, email, telegram, txn_hash, plan, status, created_at`,
    [email, normalizeTelegram(input.telegram), normalizeTxnHash(input.txnHash), input.plan]
  );
  return result.rows[0];
}

export async function listFulfillment(limit = 100): Promise<FulfillmentRow[]> {
  await ensureFulfillmentSchema();
  const result = await query<FulfillmentRow>(
    `SELECT id, email, telegram, txn_hash, plan, status, created_at
     FROM fulfillment_submissions ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function setFulfillmentStatus(id: number, status: "completed" | "rejected"): Promise<boolean> {
  await ensureFulfillmentSchema();
  const result = await query(`UPDATE fulfillment_submissions SET status = $2 WHERE id = $1`, [id, status]);
  return (result.rowCount ?? 0) > 0;
}
