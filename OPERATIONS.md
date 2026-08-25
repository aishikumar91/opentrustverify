# Operations

## Health

`GET /v1/health`

## Metrics to track (exporters pending)

- verification_latency
- verification_success_rate
- rpc_latency / rpc_errors
- api_errors
- webhook_failures
- queue_depth
- database_latency
- cache_hit_rate

## Local stack

```bash
pnpm docker:up   # Postgres :5433, Redis :6380
pnpm --filter @otv/api run dev
```

## Incidents

1. Rotate API keys (`POST /v1/api-keys/rotate`)
2. Rotate signing kid (keystore rotation — wire KMS before production)
3. Disable unsafe webhooks (SSRF deny-list already rejects private hosts)

See `SECURITY.md` and `docs/THREAT_MODEL.md`.
