# Architecture — OpenTrust Verify

Interactive maps (Archify, showcase):

- [Runtime](architecture/otv-runtime.html) — hosted OTV, signing boundary, Postgres, Redis, worker
- [Verify sequence](architecture/otv-verify.html) — `POST /v1/verify/incoming`
- [Verdict lifecycle](architecture/otv-verdict.html) — `@otv/verdict-schema` statuses
- [Evidence pipeline](architecture/otv-evidence.html) — claim → adapters → signed row → consumers

JSON sources sit next to those HTML files. After a map is delivered, do not edit that JSON.

## Trust boundary

Clients never receive signing keys. Verdicts are signed server-side (`otv.verdict.v1`, Ed25519). Clients verify the signature. All chain RPC goes through `ChainAdapter` in `@otv/chain-adapters`. No LLM sits on the spendability path.

## Runtime

| Piece | Package | Role |
|-------|---------|------|
| Product UI | `@otv/web` | Vite SPA, port 4090 |
| API | `@otv/api` | Fastify, port 4080, OpenAPI `/api/docs` |
| Engine | `@otv/verification-engine` | `verifyIncomingTransfer` |
| Adapters | `@otv/chain-adapters` | EVM, Bitcoin, Solana, Tron, mock |
| Store | `PostgresStore` | Required in production (`DATABASE_URL`) |
| Queue | Redis | Rate limits + `otv:webhook:queue` |
| Worker | `node dist/worker.js` | Same codebase as the API |

There is no NestJS app (ADR-003) and no Next.js app (ADR-002). `services/worker` is an alias that runs the API worker. Stub packages (`risk-service`, `blockchain-indexer`, a second verification-engine service) are not in the workspace.

## Tenancy

`organizations` → `projects` → `api_keys` / `webhooks` / usage. `PostgresStore` keeps row-level tenant filters.

## Monorepo

See root `README.md` and `AGENTS.md`. Decisions: [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md).
