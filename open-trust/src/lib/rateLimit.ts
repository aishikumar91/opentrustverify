/**
 * Auth-grade throttle: Redis fixed-window when REDIS_URL is set (shared across
 * replicas for load balancing), transparent in-memory fallback otherwise.
 */
import type { Redis as RedisType } from "ioredis";

const buckets = new Map<string, number[]>();
let redis: RedisType | null = null;
let redisDead = false;

function getRedis(): RedisType | null {
  const url = (process.env.REDIS_URL ?? "").trim();
  if (!url || redisDead) return null;
  if (!redis) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("ioredis") as { default: typeof import("ioredis").default };
      redis = new mod.default(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        retryStrategy: () => null,
      });
      redis.on("error", () => {
        redisDead = true;
        try {
          redis?.disconnect();
        } catch {}
        redis = null;
      });
    } catch {
      redisDead = true;
      return null;
    }
  }
  return redis;
}

function memoryCheck(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, windowMs - (now - recent[0])) };
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.length === 0 || now - v[v.length - 1] > windowMs) buckets.delete(k);
    }
  }
  return { ok: true, retryAfterMs: 0 };
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  return memoryCheck(key, limit, windowMs);
}

export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterMs: number }> {
  const client = getRedis();
  if (!client) return memoryCheck(key, limit, windowMs);
  try {
    await client.connect().catch(() => {});
    const bucket = Math.floor(Date.now() / windowMs);
    const rkey = `rl:${key}:${bucket}`;
    const count = await client.incr(rkey);
    if (count === 1) await client.pexpire(rkey, windowMs + 1000);
    if (count > limit) return { ok: false, retryAfterMs: windowMs };
    return { ok: true, retryAfterMs: 0 };
  } catch {
    return memoryCheck(key, limit, windowMs);
  }
}

export function clientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const h = req.headers ?? {};
  const fwd = h["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd ?? "";
  const ip = String(first).split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  return ip.slice(0, 64);
}
