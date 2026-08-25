# Phase Log

## PHASE 1 — Discovery — COMPLETE
Audit of POP Trust host repo; OTV sibling folder decision; PROJECT_AUDIT, PROJECT_CONTEXT, ARCHITECTURE_DECISIONS.

## PHASE 2 — Specification — COMPLETE
PRODUCT_REQUIREMENTS, VERDICT_SPEC, API_SPEC, THREAT_MODEL, ARCHITECTURE.

## PHASE 3 — Design — COMPLETE
design-tokens, ui package, POP Trust logo assets, OTV mark, marketing/verifier/dashboard shells.

## PHASE 4–9 — Data / Auth / Adapter / Engine / Sign / API — COMPLETE (MVP)
Postgres migrations + seeds; in-memory auth for demo with hashed keys; ChainAdapter + mock/ethereum; verification engine; Ed25519; Fastify API.

## PHASE 10–12 — SDK / Dashboard / Verifier — COMPLETE (MVP)
sdk-core, sdk-react, api-client; dashboard; public verifier; marketing; demo wallet.

## PHASE 13–18 — Webhooks / Security / Tests / Docs / Deploy / Demo — COMPLETE (MVP boundaries)
Signed webhooks; SECURITY.md; unit tests; whitepaper/RFCs/research; Docker Compose; `pnpm demo`.

### Known blockers (explicit)
- Live JSON-RPC eth_ methods: interface ready; mock used when RPC unset
- KMS/HSM: in-memory keys for demo
- Backend is TypeScript + Fastify only (no NestJS)
- Flutter SDK: stub
- Postgres wired in schema; API MVP uses memory store until DATABASE_URL integration lands
