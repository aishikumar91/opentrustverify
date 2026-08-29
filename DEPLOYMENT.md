# Deployment

Production topology, env vars, and boot order live in `infra/deployment/README.md`.

Quick path:

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

Frontends: static Vite builds. Map `otv.poptrust.me` (UI + `/v1` API behind Caddy).
