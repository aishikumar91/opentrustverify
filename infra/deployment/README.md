# Production deployment

OTV is a TypeScript Fastify API plus static Vite frontends. Postgres is the source of truth. Redis coordinates rate limits and the webhook queue.

## Topology

- `https://otv.poptrust.me` → `apps/web` (Caddy TLS)
- `https://otv.poptrust.me/v1` → `@otv/api`
- `https://otv.poptrust.me/docs` → product docs in the web app
- `https://otv.poptrust.me/api/docs` → OpenAPI UI
- Worker replica(s) run `node dist/worker.js` against the same Postgres + Redis

## Required environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (required in production) |
| `REDIS_URL` | Rate limits + webhook queue |
| `SESSION_SECRET` | ≥32 chars, cookie signing |
| `OTV_KMS_MASTER_KEY` | 32-byte hex wrapping signing keys at rest |
| `OTV_KEYS_DIR` | File keystore directory (default `./keys`) |
| `OTV_KID` | Active signing key id |
| `OTV_PUBLIC_URL` | OpenAPI server URL |
| `ETH_RPC_URL` | Optional live Ethereum JSON-RPC |
| `OTV_EMBED_WORKER` | `0` when a standalone worker runs |

## Sequence

1. Provision Postgres 16 + Redis 7.
2. `pnpm --filter @otv/api run migrate` (also runs automatically on API boot).
3. Build: `pnpm --filter './packages/*' --filter @otv/api run build`
4. Run API + worker images from `infra/docker`.
5. Deploy `apps/web` with `VITE_OTV_API_URL=https://otv.poptrust.me`.
6. Confirm `GET /v1/ready` returns `{ "status": "ready", "store": "postgres" }`.
7. Confirm `GET /v1/metrics` scrapes.

```bash
export SESSION_SECRET=... # 32+ chars
export OTV_KMS_MASTER_KEY=$(openssl rand -hex 32)
pnpm docker:up
curl -s http://localhost:4080/v1/ready
```

See `OPERATIONS.md` for SLOs and incident steps.
