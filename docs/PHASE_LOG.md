# Phase Log

## PHASE 1–2 — Discovery + Spec — COMPLETE
Audit, PRD, architecture, threat model, verdict/API specs.

## PHASE 3 — Design — COMPLETE
design-tokens, ui (incl. explorer components), apps/web Vercel preview.

## PHASE 4–9 — Data / Auth / Adapter / Engine / Sign / API — PARTIAL
- Engine + schema + Ed25519: complete (mock + live Ethereum RPC path)
- API Fastify: complete for MVP routes
- Postgres: schema/migrations present; **API MemoryStore still default** (P-01)
- Auth: API keys hashed; session/OIDC pending
- Webhooks: HMAC + SSRF deny-list + inline retries; durable worker pending

## PHASE 10–12 — SDK / Dashboard / Verifier — COMPLETE (MVP UI)
sdk-core, sdk-react; apps/web unified surface.

## PHASE 13–18 — PARTIAL
Security docs + gap analysis; tests for core packages; Docker Compose; demo.
Observability exporters, conformance CLI, KMS: pending.

### Known blockers (explicit)
- Wire Postgres into API for multi-instance durability
- KMS/HSM for production signing keys
- Session/OIDC for dashboard
- Flutter SDK stub
