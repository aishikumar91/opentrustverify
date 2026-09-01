# Deployment

Production topology lives in `infra/deployment/README.md`. Operations: [OPERATIONS.md](OPERATIONS.md).

## API + worker

```bash
pnpm --filter './packages/*' --filter @otv/api run build
export DATABASE_URL=postgres://...
export REDIS_URL=redis://...
export SESSION_SECRET=...          # ≥32 chars
export OTV_KMS_MASTER_KEY=...      # 64 hex chars
pnpm db:migrate
pnpm --filter @otv/api run start
pnpm --filter @otv/api run start:worker
```

Docker: `pnpm docker:up`. Confirm `GET /v1/ready` → `store: postgres`.

Map `otv.poptrust.me` (UI + `/v1` behind Caddy). Worker image: `infra/docker/Dockerfile.worker`. Set `OTV_EMBED_WORKER=0` on the API when the worker is a separate process.

Or: `pnpm --filter @otv/worker run start` (alias for the API worker).

## Product UI (`@otv/web`)

There is no in-browser signing path. Set `VITE_OTV_API_URL` to the Fastify base.

| Path | Surface |
|------|---------|
| `/` | Product home |
| `/login` `/register` | Auth |
| `/about` `/whitepaper` `/security` `/contact` | Public product pages |
| `/docs` | Developer docs |
| `/verifier` | Public verdict lookup + authenticated verify |
| `/dashboard` | Keys, verifications, webhooks, billing, audit |
| `/wallet` | Wallet integration profile |

Session tokens from login/register are stored as `otv_session_token` and sent as `X-OTV-Session`.

```bash
pnpm install
pnpm --filter './packages/*' run build
pnpm dev:web
```
