import { createHmac } from "node:crypto";
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

export async function dispatchWebhooks(event: WebhookEvent, verdict: Verdict): Promise<void> {
  const payload = JSON.stringify({
    id: `evt_${verdict.verdictId}_${event}`,
    event,
    createdAt: new Date().toISOString(),
    data: verdict,
  });

  for (const hook of store.webhooks.values()) {
    if (!hook.events.includes(event) && !hook.events.includes("*")) continue;
    // MVP: attempt delivery; block private IPs in production gateway
    try {
      const signature = signBody(hook.secret, payload);
      await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OTV-Signature": signature,
          "X-OTV-Event": event,
          "Idempotency-Key": `${verdict.verdictId}:${event}`,
        },
        body: payload,
        signal: AbortSignal.timeout(5000),
      });
      store.usage.webhooks += 1;
    } catch {
      // retries / backoff owned by worker service in later phase
    }
  }
}

export function mapStatusToEvent(status: Verdict["status"]): WebhookEvent {
  if (status === "SPENDABLE" || status === "FINAL") return "verification.final";
  if (status === "REJECTED") return "verification.failed";
  if (status === "SUSPICIOUS") return "verification.suspicious";
  return "verification.created";
}
