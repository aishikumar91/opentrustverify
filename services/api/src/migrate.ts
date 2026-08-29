import pg from "pg";
import { migrate } from "./lib/migrate.js";

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const pool = new Pool({ connectionString: url });
const applied = await migrate(pool);
console.log(applied.length ? `applied: ${applied.join(", ")}` : "migrations already applied");
await pool.end();
