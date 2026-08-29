# Webhook delivery contract

## Register

`POST /v1/webhooks` (API key). URL must pass the SSRF deny-list (no localhost, loopback, RFC1918, link-local, `.internal`, `.local`). Secret is returned **once**.

## Event names

| Event | When |
|-------|------|
| `verification.final` | Status `SPENDABLE` or `FINAL` |
| `verification.failed` | `REJECTED` |
| `verification.suspicious` | `SUSPICIOUS` |
| `verification.created` | Other statuses |

## Request

```
POST {url}
Content-Type: application/json
X-OTV-Signature: hex(HMAC-SHA256(secret, rawBody))
X-OTV-Event: verification.final
Idempotency-Key: {verdictId}:{event}
```

Body: `{ "id", "event", "createdAt", "data": <otv.verdict.v1> }`.

## Durability

1. Row inserted into `webhook_deliveries` (`pending`).
2. Job pushed to Redis list `otv:webhook:queue` when `REDIS_URL` is set.
3. Worker (`node dist/worker.js` or embedded `OTV_EMBED_WORKER=1`) delivers with backoff `[0, 200ms, 800ms, 2s, 8s, 30s, 2m, 5m]`.
4. Delayed retries live in Redis sorted set `otv:webhook:delayed`.
5. Without Redis, the API performs the first three attempts inline (local/dev).

Terminal statuses: `delivered`, `failed`. `GET /v1/audit` records SSRF blocks and exhausted retries.
