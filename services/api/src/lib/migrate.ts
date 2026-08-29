import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../");

const FILES = [
  { id: "001_core", file: path.join(ROOT, "database/migrations/001_core.sql") },
  { id: "002_production", file: path.join(ROOT, "database/migrations/002_production.sql") },
  { id: "seed_001_demo", file: path.join(ROOT, "database/seeds/001_demo.sql") },
] as const;

export async function migrate(pool: Pool): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const applied: string[] = [];
  for (const step of FILES) {
    const { rows } = await pool.query("SELECT id FROM schema_migrations WHERE id = $1", [step.id]);
    if (rows.length > 0) continue;
    const sql = await readFile(step.file, "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [step.id]);
    applied.push(step.id);
  }
  return applied;
}
