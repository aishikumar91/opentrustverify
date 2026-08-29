import { Redis } from "ioredis";

export async function createRedis(): Promise<Redis | undefined> {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      console.warn("REDIS_URL unset — using in-process rate limits and inline webhook delivery");
    }
    return undefined;
  }
  const redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  await redis.connect();
  return redis;
}
