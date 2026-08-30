# MVP boundaries

Honest scope for hosted OTV **0.1.0**.

## In

- Deterministic verification engine + `otv.verdict.v1` + Ed25519 (hex)
- Fastify API with OpenAPI
- Postgres persistence (orgs, keys, verdicts, evidence, webhooks, sessions, audit, usage)
- Redis rate limits + webhook queue
- File keystore with local AES-GCM wrap or AWS KMS envelope DEK
- Session cookies + hashed API keys + OIDC authorization-code/PKCE when configured
- Multi-chain adapters: EVM (any ERC-20/721/1155), Bitcoin, Solana, Tron. Public RPC by default; dedicated RPC optional.
- TS/React SDKs, explorer UI primitives, demo wallet (no custody)
- Prometheus `/v1/metrics`, `/v1/ready`
- OTV-0010 conformance tests (`pnpm conformance`)

## Out (explicit)

- Hardware HSM in process (AWS KMS envelope is implemented; attach credentials to go live)
- A hosted identity provider (OIDC code is live; 501 until `OIDC_ISSUER` is set)
- Payment-provider billing (plan enum + usage meters only)
- LLM/RAG in the spendability path (forbidden)
- Flutter as a first-class published pub.dev package (Dart client is included; not certified)
- Legal license split (ADR-009)

Browser demo signing in `apps/web` is **not** production key management.
