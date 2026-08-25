# OpenTrust Verify (OTV)

**Trust the balance, not just the blockchain event.**

OpenTrust Verify is digital-asset verification infrastructure under the **POP Trust** brand family.

| | |
|--|--|
| Product | OpenTrust Verify / OTV |
| Parent brand | POP Trust |
| Marketing | `https://verify.poptrust.me` |
| API | `https://api.verify.poptrust.me` |
| Docs | `https://docs.verify.poptrust.me` |

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
├── apps/           # marketing, dashboard, verifier, demo-wallet, docs
├── packages/       # sdk, verdict-schema, crypto, adapters, ui, tokens
├── services/       # api + engine/worker boundaries
├── database/       # migrations, seeds, schema
├── docs/           # specs, RFCs, whitepaper, research
├── infra/docker/   # compose + Dockerfiles
└── brand/assets/   # POP Trust logo + OTV mark
```

## Quick start

```bash
cd opentrust-verify
pnpm install
pnpm --filter './packages/*' run build
pnpm --filter @otv/api run dev          # http://localhost:4080
pnpm --filter @otv/marketing run dev    # http://localhost:4083
pnpm --filter @otv/verifier run dev     # http://localhost:4082
pnpm --filter @otv/dashboard run dev    # http://localhost:4081
pnpm --filter @otv/demo-wallet run dev  # http://localhost:4084
```

Demo API key (local): `otv_test_demo_key_change_me`

```bash
curl -s http://localhost:4080/v1/verify/incoming \
  -H "Authorization: Bearer otv_test_demo_key_change_me" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"ethereum",
    "network":"sepolia",
    "transactionHash":"0xdemo000000000000000000000000000000000000000000000000000000000001",
    "recipient":"0x2222222222222222222222222222222222222222",
    "asset":{"type":"erc20","contract":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","symbol":"USDC"},
    "expectedAmount":"1000000"
  }' | jq .
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

## Documentation

- [PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md)
- [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md)
- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [THREAT_MODEL.md](docs/THREAT_MODEL.md)
- [VERDICT_SPEC.md](docs/VERDICT_SPEC.md)
- [Whitepaper](docs/whitepaper/OTV_WHITEPAPER.md)
- [Competitor analysis](docs/research/COMPETITOR_ANALYSIS.md)

## License

See [LICENSE.md](LICENSE.md). Protocol vs hosted service licensing is under review.
