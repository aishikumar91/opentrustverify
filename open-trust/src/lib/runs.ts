/**
 * Persist / load executed trigger runs in Postgres (shared otv DB).
 */

import { query } from "./db";

export interface ExecutedRunRow {
  id: number;
  tx_hash: string;
  vector: string;
  target_address: string;
  explorer_url: string | null;
  status: string | null;
  threat_score: number | null;
  real_balance_impact: string | null;
  reasons: string[] | null;
  action_recommended: string | null;
  broadcast_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutedRun {
  id: number;
  txHash: string;
  vector: string;
  targetAddress: string;
  explorerUrl: string;
  status: string | null;
  threatScore: number | null;
  realBalanceImpact: string | null;
  reasons: string[];
  actionRecommended: string | null;
  broadcastAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

let ensured = false;

export async function ensureExecutedRunsTable(): Promise<void> {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS executed_runs (
      id SERIAL PRIMARY KEY,
      tx_hash TEXT NOT NULL UNIQUE,
      vector TEXT NOT NULL,
      target_address TEXT NOT NULL,
      explorer_url TEXT,
      status TEXT,
      threat_score INTEGER,
      real_balance_impact TEXT,
      reasons JSONB,
      action_recommended TEXT,
      broadcast_at TIMESTAMPTZ,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS executed_runs_broadcast_at_idx
      ON executed_runs (broadcast_at DESC NULLS LAST, created_at DESC);
  `);
  ensured = true;
}

function mapRow(row: ExecutedRunRow): ExecutedRun {
  let reasons: string[] = [];
  if (Array.isArray(row.reasons)) {
    reasons = row.reasons;
  } else if (row.reasons && typeof row.reasons === "object") {
    reasons = [];
  }

  return {
    id: row.id,
    txHash: row.tx_hash,
    vector: row.vector,
    targetAddress: row.target_address,
    explorerUrl: row.explorer_url ?? "",
    status: row.status,
    threatScore: row.threat_score,
    realBalanceImpact: row.real_balance_impact,
    reasons,
    actionRecommended: row.action_recommended,
    broadcastAt: row.broadcast_at,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertExecutedRun(input: {
  txHash: string;
  vector: string;
  targetAddress: string;
  explorerUrl: string;
  broadcastAt: string;
}): Promise<ExecutedRun> {
  await ensureExecutedRunsTable();
  const result = await query<ExecutedRunRow>(
    `INSERT INTO executed_runs (
       tx_hash, vector, target_address, explorer_url, status, broadcast_at
     ) VALUES ($1, $2, $3, $4, 'BROADCAST', $5)
     ON CONFLICT (tx_hash) DO UPDATE SET
       vector = EXCLUDED.vector,
       target_address = EXCLUDED.target_address,
       explorer_url = EXCLUDED.explorer_url,
       broadcast_at = COALESCE(EXCLUDED.broadcast_at, executed_runs.broadcast_at),
       updated_at = NOW()
     RETURNING *`,
    [
      input.txHash,
      input.vector,
      input.targetAddress,
      input.explorerUrl,
      input.broadcastAt,
    ]
  );
  return mapRow(result.rows[0]);
}

export async function updateExecutedRunAssessment(input: {
  txHash: string;
  status: string;
  threatScore: number;
  vector?: string;
  realBalanceImpact: string;
  reasons: string[];
  actionRecommended: string;
  targetAddress?: string;
  explorerUrl?: string;
}): Promise<ExecutedRun> {
  await ensureExecutedRunsTable();
  const result = await query<ExecutedRunRow>(
    `INSERT INTO executed_runs (
       tx_hash, vector, target_address, explorer_url,
       status, threat_score, real_balance_impact, reasons, action_recommended,
       verified_at
     ) VALUES (
       $1, COALESCE($2, 'UNKNOWN'), COALESCE($3, ''), $4,
       $5, $6, $7, $8::jsonb, $9, NOW()
     )
     ON CONFLICT (tx_hash) DO UPDATE SET
       status = EXCLUDED.status,
       threat_score = EXCLUDED.threat_score,
       vector = COALESCE($2, executed_runs.vector),
       real_balance_impact = EXCLUDED.real_balance_impact,
       reasons = EXCLUDED.reasons,
       action_recommended = EXCLUDED.action_recommended,
       verified_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [
      input.txHash,
      input.vector ?? null,
      input.targetAddress ?? "",
      input.explorerUrl ?? null,
      input.status,
      input.threatScore,
      input.realBalanceImpact,
      JSON.stringify(input.reasons),
      input.actionRecommended,
    ]
  );
  return mapRow(result.rows[0]);
}

export async function listExecutedRuns(limit = 50): Promise<ExecutedRun[]> {
  await ensureExecutedRunsTable();
  const result = await query<ExecutedRunRow>(
    `SELECT * FROM executed_runs
     ORDER BY COALESCE(broadcast_at, created_at) DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(mapRow);
}
