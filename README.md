# OpenTrust Verify (OTV)

**Trust the balance, not just the blockchain event.**

OpenTrust Verify is digital-asset verification infrastructure under the **POP Trust** brand family.

| | |
|--|--|
| Product | OpenTrust Verify / OTV |
| Parent brand | POP Trust |
| Product UI | `https://otv.poptrust.me` |
| API | `https://otv.poptrust.me/v1` |
| Docs | `https://otv.poptrust.me/docs` |
| Interactive API | `https://otv.poptrust.me/api/docs` |

OTV helps wallets, exchanges, explorers, and fintech apps determine whether an observed incoming blockchain event represents **verified, spendable value** for a recipient.

## Core principle

```
Blockchain activity
  ≠ Executed transaction
  ≠ Asset transfer
  ≠ Recipient balance increase
  ≠ Final transaction
  ≠ Spendable funds
```

## Monorepo

```
opentrust-verify/
├── apps/web              # Canonical product UI (port 4090)
├── packages/             # sdk, verdict-schema, crypto, adapters, ui, tokens
├── services/api          # Fastify API + webhook worker
├── services/worker       # alias: pnpm --filter @otv/api run worker
├── database/             # migrations, seeds, schema
├── docs/                 # index in docs/README.md
├── docs/architecture/    # Archify runtime / sequence / lifecycle / dataflow
└── infra/docker/         # compose + Dockerfiles
```

The product UI is `@otv/web` on port 4090. Dashboard, verifier, docs, and wallet are routes in that app.

## Quick start

```bash
pnpm install
pnpm --filter './packages/*' run build
pnpm docker:up                          # Postgres :5433, Redis :6380, API :4080
pnpm dev                                # API + unified web UI
```

Create an account at `http://localhost:4090/register`, then use the dashboard to mint API keys and submit verifications. The UI talks to the Fastify API (Postgres-backed). Signing never happens in the browser.

```bash
# After creating a key in the dashboard:
curl -s http://localhost:4080/v1/verify/incoming \
  -H "Authorization: Bearer otv_live_…" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"ethereum",
    "network":"sepolia",
    "transactionHash":"0x…",
    "recipient":"0x…",
    "asset":{"type":"erc20","contract":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","symbol":"USDC"}
  }'
```

Point the UI at a remote API with `apps/web/.env`:

```
VITE_OTV_API_URL=https://otv.poptrust.me
```

Offline engine demo:

```bash
pnpm demo
```

Docker (Postgres + Redis):

```bash
pnpm docker:up
```

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind, TanStack Query, React Router, Zod
- **Backend:** TypeScript + Fastify (`services/api`)
- **Data:** PostgreSQL + Redis
- **Crypto:** Ed25519 signed verdicts (`otv.verdict.v1`)
- **Chains:** Adapter abstraction; Ethereum + mock for MVP

## Agent context

Start at [AGENTS.md](AGENTS.md). Refresh a full-tree dump with [context-builder](https://github.com/igorls/context-builder) using `context-builder.toml`. See [docs/handoffs/project-context](docs/handoffs/project-context).

## Documentation

Index: [docs/README.md](docs/README.md).

Architecture (open the HTML):

- [Runtime](docs/architecture/otv-runtime.html)
- [Verify sequence](docs/architecture/otv-verify.html)
- [Verdict lifecycle](docs/architecture/otv-verdict.html)
- [Evidence pipeline](docs/architecture/otv-evidence.html)

- [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md)
- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [THREAT_MODEL.md](docs/THREAT_MODEL.md)
- [VERDICT_SPEC.md](docs/VERDICT_SPEC.md)
- [Whitepaper](docs/whitepaper/OTV_WHITEPAPER.md)

## License

See [LICENSE.md](LICENSE.md). Protocol vs hosted service licensing is under review.

## Product UI

Unified app `@otv/web` (home, auth, dashboard, verifier, docs, whitepaper, wallet).

```bash
pnpm build:web
pnpm preview:web
```
