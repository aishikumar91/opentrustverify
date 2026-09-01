# Phase Log

## PHASE 1–2 — Discovery + Spec — COMPLETE

Audit, PRD, architecture, threat model, verdict/API specs, RFCs.

## PHASE 3 — Design — COMPLETE

design-tokens, ui (explorer components), apps/web Vercel preview.

## PHASE 4–9 — Data / Auth / Adapter / Engine / Sign / API — COMPLETE (MVP)

- Engine + schema + Ed25519 (mock + live Ethereum RPC)
- Fastify API with OpenAPI, `/v1/ready`, `/v1/metrics`
- **Postgres** wired as runtime source of truth (`PostgresStore`; MemoryStore only when `DATABASE_URL` unset in non-production)
- **Redis** rate limits + webhook queue
- **Session cookies** + hashed API keys; Google OIDC live on the hosted site
- **File keystore** + optional local KMS wrap
- Webhooks: HMAC + SSRF deny-list + `webhook_deliveries` + worker

## PHASE 10–12 — SDK / Dashboard / Verifier — COMPLETE (MVP UI)

sdk-core, sdk-react; Dart client in `packages/sdk-flutter`; apps/web unified surface.

## PHASE 13–18 — COMPLETE (MVP ops)

Conformance CLI (`pnpm conformance`), Prometheus exporters, Docker images running compiled `dist`, deployment runbook.

### Remaining (non-MVP)

- Attach AWS KMS credentials on the VPS (envelope encryption is already in the API)
- Attach an OIDC issuer on the VPS (`infra/oidc/bootstrap.py`; API returns 501 until `OIDC_ISSUER` is set)
- Payment-provider billing (plan enum + usage meters only)
- Additional L1s beyond EVM, Bitcoin, Solana, and Tron
