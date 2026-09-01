# Operations

## Health

| Endpoint | Meaning |
|----------|---------|
| `GET /v1/health` | Liveness: process up, product identity |
| `GET /v1/ready` | Readiness: Postgres ping, Redis ping (if configured), active signing kid |
| `GET /v1/metrics` | Prometheus text exposition |

## SLOs (hosted MVP)

| SLO | Target |
|-----|--------|
| Mock verify p95 | < 500 ms |
| Live verify p95 | RPC-bound; alert if `otv_verification_duration_seconds` p95 > 5s for 15m |
| Ready success | 99.9% excluding planned deploys |
| Webhook eventual delivery | ≥ 99% within 15 minutes when subscriber is up |

## Metrics

| Name | Type | Meaning |
|------|------|---------|
| `otv_verifications_total` | counter | Completed verifies by `status`, `adapter` |
| `otv_verification_duration_seconds` | histogram | Engine + signing latency |
| `otv_webhook_deliveries_total` | counter | `delivered` / `retry` / `failed` / `ssrf_blocked` |
| `otv_webhook_queue_depth` | gauge | Redis list length |
| `otv_api_errors_total` | counter | 5xx by route |
| `otv_store_backend_info` | gauge | `memory` or `postgres` |

Dashboards: scrape with `infra/monitoring/prometheus.yml`. Alerts: `infra/monitoring/alerts.yml`.

## Local stack

```bash
pnpm docker:up   # Postgres :5433, Redis :6380, API :4080, worker
pnpm --filter @otv/api run dev
```

Demo login: `demo@poptrust.me` / `otv-demo-change-me`. Demo API key: `otv_test_demo_key_change_me`.

## Incidents

1. **Not ready** — check Postgres, `DATABASE_URL`, `keys/` kid. `GET /v1/ready` body has the error.
2. **Rotate API keys** — `POST /v1/api-keys/rotate` (session or admin key).
3. **Rotate signing kid** — [security/KMS.md](security/KMS.md).
4. **Webhook flood / SSRF** — deny-list already rejects private hosts; disable the hook row in `webhooks`.
5. **Queue backup** — scale worker replicas; inspect `otv:webhook:queue`.

See root `SECURITY.md` and [THREAT_MODEL.md](THREAT_MODEL.md).
