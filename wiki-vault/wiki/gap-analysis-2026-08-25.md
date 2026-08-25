---
type: source-note
title: Gap Analysis 2026-08-25
status: evergreen
created: 2026-08-25
updated: 2026-08-25
tags:
  - otv
  - audit
---

# Gap Analysis 2026-08-25

Canonical file: `docs/GAP_ANALYSIS.md` (in repo).

## Key mismatches closed or reduced

| Issue | Resolution |
|-------|------------|
| Always-mock Ethereum | Live JSON-RPC when `ETH_RPC_URL` set |
| base64url vs hex signatures | Spec updated to hex for v1 |
| Unauthenticated enterprise routes | API-key gated |
| Missing explorer components | Added to `@otv/ui` |
| Webhook SSRF / no retries | Deny-list + backoff retries |
| Overstated PHASE_LOG | Rewritten as PARTIAL where honest |

## Still open

See `docs/PENDING.md` — Postgres wiring, Redis, KMS, OIDC, conformance CLI.
