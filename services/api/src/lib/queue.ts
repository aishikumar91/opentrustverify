import { Redis } from "ioredis";
import { hexId } from "./ids.js";
import { queueDepth } from "./metrics.js";
import type { OtvStore, WebhookDelivery } from "./store.js";

export const QUEUE_KEY = "otv:webhook:queue";
export const DELAYED_KEY = "otv:webhook:delayed";

export interface WebhookJob {
  deliveryId: string;
  webhookId: string;
  projectId: string;
  url: string;
  secret: string;
  event: string;
  payload: string;
  idempotencyKey: string;
  attempt: number;
}

export async function enqueueWebhook(
  redis: Redis | undefined,
  store: OtvStore,
  job: Omit<WebhookJob, "deliveryId" | "attempt">
): Promise<WebhookDelivery> {
  const delivery = await store.insertDelivery({
    id: hexId("del"),
    webhookId: job.webhookId,
    event: job.event,
    payload: JSON.parse(job.payload) as Record<string, unknown>,
    idempotencyKey: job.idempotencyKey,
    nextAttemptAt: new Date().toISOString(),
  });
  const full: WebhookJob = { ...job, deliveryId: delivery.id, attempt: 0 };
  if (redis) {
    await redis.rpush(QUEUE_KEY, JSON.stringify(full));
    queueDepth.set(await redis.llen(QUEUE_KEY));
  }
  return delivery;
}

export async function popWebhookJob(redis: Redis, timeoutSec = 2): Promise<WebhookJob | null> {
  await promoteDelayed(redis);
  const result = await redis.blpop(QUEUE_KEY, timeoutSec);
  if (!result) return null;
  queueDepth.set(await redis.llen(QUEUE_KEY));
  return JSON.parse(result[1]) as WebhookJob;
}

export async function delayWebhookJob(redis: Redis, job: WebhookJob, delayMs: number): Promise<void> {
  const score = Date.now() + delayMs;
  await redis.zadd(DELAYED_KEY, score, JSON.stringify(job));
}

async function promoteDelayed(redis: Redis): Promise<void> {
  const now = Date.now();
  const due = await redis.zrangebyscore(DELAYED_KEY, 0, now);
  if (due.length === 0) return;
  const pipeline = redis.pipeline();
  for (const raw of due) {
    pipeline.rpush(QUEUE_KEY, raw);
    pipeline.zrem(DELAYED_KEY, raw);
  }
  await pipeline.exec();
}
