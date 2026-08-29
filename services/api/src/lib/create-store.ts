import pg from "pg";
import { migrate } from "./migrate.js";
import { PostgresStore } from "./pg-store.js";
import { MemoryStore, type OtvStore } from "./store.js";

const { Pool } = pg;

export async function createStore(): Promise<OtvStore> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pool = new Pool({ connectionString: url, max: 10 });
    await migrate(pool);
    const store = new PostgresStore(pool);
    await store.ready();
    return store;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production (Postgres is the source of truth)");
  }
  const store = new MemoryStore();
  await store.ready();
  return store;
}
