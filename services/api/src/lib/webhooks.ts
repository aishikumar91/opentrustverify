import { createHmac, randomBytes } from "node:crypto";
import type { Verdict } from "@otv/verdict-schema";
import { store } from "./store.js";

export type WebhookEvent =
  | "verification.created"
  | "verification.updated"
  | "verification.final"
  | "verification.failed"
  | "verification.suspicious";

function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Block obvious SSRF targets for webhook delivery (MVP deny-list). */
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
  // Private IPv4 ranges
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

async function deliverOnce(
  url: string,
  secret: string,
  event: WebhookEvent,
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

/** Exponential backoff retries: immediate, then 200ms, 800ms (MVP inline; worker owns durable queue). */
export async function dispatchWebhooks(event: WebhookEvent, verdict: Verdict): Promise<void> {
  const payload = JSON.stringify({
    id: `evt_${verdict.verdictId}_${event}`,
    event,
    createdAt: new Date().toISOString(),
    data: verdict,
  });
  const delays = [0, 200, 800];

  for (const hook of store.webhooks.values()) {
    if (!hook.events.includes(event) && !hook.events.includes("*")) continue;
    if (!isSafeWebhookUrl(hook.url)) {
      store.audit.push({
        id: `aud_${randomBytes(4).toString("hex")}`,
        at: new Date().toISOString(),
        actor: "webhook-service",
        action: "webhook.ssrf_blocked",
        meta: { webhookId: hook.id, url: hook.url },
      });
      continue;
    }
    const idempotencyKey = `${verdict.verdictId}:${event}`;
    let delivered = false;
    let lastError: string | undefined;
    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt]! > 0) await new Promise((r) => setTimeout(r, delays[attempt]));
      const result = await deliverOnce(hook.url, hook.secret, event, payload, idempotencyKey);
      if (result.ok) {
        delivered = true;
        store.usage.webhooks += 1;
        break;
      }
      lastError = result.error;
    }
    if (!delivered) {
      store.audit.push({
        id: `aud_${randomBytes(4).toString("hex")}`,
        at: new Date().toISOString(),
        actor: "webhook-service",
        action: "webhook.delivery_failed",
        meta: { webhookId: hook.id, event, error: lastError },
      });
    }
  }
}

export function mapStatusToEvent(status: Verdict["status"]): WebhookEvent {
  if (status === "SPENDABLE" || status === "FINAL") return "verification.final";
  if (status === "REJECTED") return "verification.failed";
  if (status === "SUSPICIOUS") return "verification.suspicious";
  return "verification.created";
}
