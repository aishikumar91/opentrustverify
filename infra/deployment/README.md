# Production deployment

OTV is a TypeScript Fastify API plus static Vite frontends. Postgres is the source of truth. Redis coordinates rate limits and the webhook queue.

## Topology

- `https://otv.poptrust.me` → `apps/web` (Caddy TLS)
- `https://otv.poptrust.me/v1` → `@otv/api`
- `https://otv.poptrust.me/docs` → product docs in the web app
- `https://otv.poptrust.me/api/docs` → OpenAPI UI
- `https://otv.poptrust.me/trigger` → Open Trust Admin (`open-trust`, Next.js on `:4091`)
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

See `docs/OPERATIONS.md` for SLOs and incident steps.

## HTTPS on `otv.poptrust.me`

Append `infra/caddy/otv.poptrust.me.caddy` to the edge Caddyfile and reload `edge-caddy`.
The snippet proxies `/trigger*` to `host.docker.internal:4091`.

If the hostname is orange-clouded on Cloudflare, visitors hit **525** until origin TLS exists for that name. Grey-cloud the A record until Caddy has a certificate, then proxy again with SSL mode **Full**. Do not point Cloudflare at origin HTTP-only with Full/Full (strict).

Swagger UI is served by the API at `/api/docs`. Caddy must proxy `/api/docs*` without stripping `/api`, and should also rewrite legacy `/docs/static*` and `/docs/json` to `/api/...` so the SPA at `/docs` does not swallow those assets.

## Open Trust Admin (`/trigger`)

Compose service `trigger` in `infra/docker/docker-compose.vps.yml` builds `infra/docker/Dockerfile.trigger` from `open-trust/`. Edge Caddy proxies `/trigger*` to `host.docker.internal:4091` (see `infra/caddy/otv.poptrust.me.caddy`).

| Env (VPS `.env`) | Used as |
|------------------|---------|
| `OTV_PG_PASSWORD` | Shared Postgres (`admin_users` table in `otv` DB) |
| `SESSION_SECRET` | Admin session cookie HMAC |
| `DEMO_PASSWORD` | Seeded `admin` password (`DEFAULT_ADMIN_PASSWORD`) |
| `BASE_RPC_URL` / `ETH_RPC_URL` / `EVM_RPC_URL` | Mapped to `RPC_URL` in the container entrypoint (use VPS mainnet RPC; do not invent Sepolia) |
| `TRIGGER_ALLOW_MAINNET` | Keep `true` when RPC/chain is Base mainnet (`TRIGGER_CHAIN_ID=8453`) |
| `TRIGGER_ADMIN_SIGNER_PRIVATE_KEY` | Optional broadcast key — leave empty unless intentionally set on the VPS |
| `TRIGGER_ADMIN_ALLOWLIST` | Optional comma-separated allowlisted wallets |
| `VITE_WALLETCONNECT_PROJECT_ID` / `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect for admin link-wallet; reuse OTV web id, never invent |

Do not invent MetaMask / broadcast private keys. Without `TRIGGER_ADMIN_SIGNER_PRIVATE_KEY`, login and the console still work; live execute routes refuse until a key is configured. Without a WalletConnect project id, MetaMask / injected connect still works; the WalletConnect button stays disabled with a config message.

```bash
# On the VPS (deploy root = /home/administrator/deployments/opentrust-verify)
bash infra/deployment/deploy-vps-trigger.sh

# From a workstation with SSH key access
export VPS_SSH_PRIVATE_KEY="$(cat ~/.ssh/opentrustverify_vps)"   # or VPS_SSH_KEY=/path/to/key
DEPLOY_HOST=administrator@93.127.142.159 \
  bash infra/deployment/deploy-vps-trigger.sh --remote

# Password auth (export SSHPASS in your shell; never commit it)
# export SSHPASS='…'
# DEPLOY_HOST=administrator@93.127.142.159 \
#   bash infra/deployment/deploy-vps-trigger.sh --remote
```

Default login after seed: `admin` / value of `DEMO_PASSWORD` (fallback `otv-demo-change-me`).
