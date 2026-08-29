import { createHmac } from "node:crypto";
import { Redis } from "ioredis";
import type { Verdict } from "@otv/verdict-schema";
import { hexId } from "./ids.js";
import { webhookTotal } from "./metrics.js";
import { delayWebhookJob, enqueueWebhook, type WebhookJob } from "./queue.js";
import type { OtvStore } from "./store.js";

export type WebhookEvent =
  | "verification.created"
  | "verification.updated"
  | "verification.final"
  | "verification.failed"
  | "verification.suspicious";

const BACKOFF_MS = [0, 200, 800, 2_000, 8_000, 30_000, 120_000, 300_000];

function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Block obvious SSRF targets for webhook delivery. */
export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 127) return false;
  }
  return true;
}

export async function deliverOnce(
  url: string,
  secret: string,
  event: string,
  payload: string,
  idempotencyKey: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const signature = signBody(secret, payload);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OTV-Signature": signature,
        "X-OTV-Event": event,
        "Idempotency-Key": idempotencyKey,
      },
      body: payload,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "delivery_failed" };
  }
}

export async function processWebhookJob(
  store: OtvStore,
  redis: Redis | undefined,
  job: WebhookJob
): Promise<"delivered" | "retry" | "failed"> {
  if (!isSafeWebhookUrl(job.url)) {
    await store.updateDelivery(job.deliveryId, { status: "failed", lastError: "ssrf_blocked" });
    webhookTotal.inc({ result: "ssrf_blocked" });
    return "failed";
  }
  const result = await deliverOnce(job.url, job.secret, job.event, job.payload, job.idempotencyKey);
  const attempts = job.attempt + 1;
  if (result.ok) {
    await store.updateDelivery(job.deliveryId, {
      status: "delivered",
      attempts,
      responseStatus: result.status,
    });
    await store.incrementWebhookUsage(job.projectId);
    webhookTotal.inc({ result: "delivered" });
    return "delivered";
  }
  const delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)] ?? 300_000;
  if (attempts >= BACKOFF_MS.length) {
    await store.updateDelivery(job.deliveryId, {
      status: "failed",
      attempts,
      lastError: result.error,
      responseStatus: result.status,
    });
    await store.addAudit({
      actor: "webhook-service",
      action: "webhook.delivery_failed",
      meta: { webhookId: job.webhookId, event: job.event, error: result.error },
    });
    webhookTotal.inc({ result: "failed" });
    return "failed";
  }
  await store.updateDelivery(job.deliveryId, {
    status: "retrying",
    attempts,
    lastError: result.error,
    nextAttemptAt: new Date(Date.now() + delay).toISOString(),
    responseStatus: result.status,
  });
  webhookTotal.inc({ result: "retry" });
  if (redis) {
    await delayWebhookJob(redis, { ...job, attempt: attempts }, delay);
  }
  return "retry";
}

export async function dispatchWebhooks(
  store: OtvStore,
  redis: Redis | undefined,
  event: WebhookEvent,
  verdict: Verdict
): Promise<void> {
  const payload = JSON.stringify({
    id: `evt_${verdict.verdictId}_${event}`,
    event,
    createdAt: new Date().toISOString(),
    data: verdict,
  });
  const hooks = await store.listWebhooks();
  for (const hook of hooks) {
    if (!hook.events.includes(event) && !hook.events.includes("*")) continue;
    if (!isSafeWebhookUrl(hook.url)) {
      await store.addAudit({
        actor: "webhook-service",
        action: "webhook.ssrf_blocked",
        meta: { webhookId: hook.id, url: hook.url },
      });
      continue;
    }
    const idempotencyKey = `${verdict.verdictId}:${event}`;
    const delivery = await enqueueWebhook(redis, store, {
      webhookId: hook.id,
      projectId: hook.projectId,
      url: hook.url,
      secret: hook.secret,
      event,
      payload,
      idempotencyKey,
    });
    if (!redis) {
      let attempt = 0;
      for (const wait of BACKOFF_MS.slice(0, 3)) {
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        const outcome = await processWebhookJob(store, undefined, {
          deliveryId: delivery.id,
          webhookId: hook.id,
          projectId: hook.projectId,
          url: hook.url,
          secret: hook.secret,
          event,
          payload,
          idempotencyKey,
          attempt,
        });
        if (outcome !== "retry") break;
        attempt += 1;
      }
    }
  }
}

export function mapStatusToEvent(status: Verdict["status"]): WebhookEvent {
  if (status === "SPENDABLE" || status === "FINAL") return "verification.final";
  if (status === "REJECTED") return "verification.failed";
  if (status === "SUSPICIOUS") return "verification.suspicious";
  return "verification.created";
}

export function newDeliveryId(): string {
  return hexId("del");
}
