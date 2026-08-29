# MVP boundaries

Honest scope for hosted OTV **0.1.0**.

## In

- Deterministic verification engine + `otv.verdict.v1` + Ed25519 (hex)
- Fastify API with OpenAPI
- Postgres persistence (orgs, keys, verdicts, evidence, webhooks, sessions, audit, usage)
- Redis rate limits + webhook queue
- File keystore with optional AES-GCM wrap (`OTV_KMS_MASTER_KEY`)
- Session cookies + hashed API keys
- Mock adapter always; live Ethereum JSON-RPC when `ETH_RPC_URL` is set
- TS/React SDKs, explorer UI primitives, demo wallet (no custody)
- Prometheus `/v1/metrics`, `/v1/ready`
- OTV-0010 conformance tests (`pnpm conformance`)

## Out (explicit)

- Cloud HSM / AWS KMS provider implementation
- Live OIDC/SSO (501 + design in `docs/security/OIDC.md`)
- Payment-provider billing (plan enum + usage meters only)
- Multi-chain production adapters beyond Ethereum + mock
- LLM/RAG in the spendability path (forbidden)
- Flutter as a first-class published pub.dev package (Dart client is included; not certified)
- Legal license split (ADR-009)

Browser demo signing in `apps/web` is **not** production key management.
