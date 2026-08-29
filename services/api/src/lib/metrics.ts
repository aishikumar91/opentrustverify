import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: "otv_" });

export const verificationTotal = new Counter({
  name: "otv_verifications_total",
  help: "Incoming verification requests completed",
  labelNames: ["status", "adapter"] as const,
  registers: [registry],
});

export const verificationDuration = new Histogram({
  name: "otv_verification_duration_seconds",
  help: "Time to produce a signed verdict",
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const webhookTotal = new Counter({
  name: "otv_webhook_deliveries_total",
  help: "Webhook delivery attempts",
  labelNames: ["result"] as const,
  registers: [registry],
});

export const apiErrors = new Counter({
  name: "otv_api_errors_total",
  help: "API handler errors",
  labelNames: ["route"] as const,
  registers: [registry],
});

export const queueDepth = new Gauge({
  name: "otv_webhook_queue_depth",
  help: "Redis webhook queue length",
  registers: [registry],
});

export const storeBackend = new Gauge({
  name: "otv_store_backend_info",
  help: "1 when the named store backend is active",
  labelNames: ["backend"] as const,
  registers: [registry],
});
