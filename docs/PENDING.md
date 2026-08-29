# Pending Work & Documentation Tracker

Updated 2026-08-28 after Postgres + production wiring.

| ID | Item | Status | Severity |
|----|------|--------|----------|
| P-01 | Wire Postgres into API (replace MemoryStore for durable MVP) | **Done** | — |
| P-02 | Redis rate-limit / queue backend | **Done** | — |
| P-03 | File/KMS keystore for signing keys | **Done** (file + local AES-GCM; cloud HSM later) | — |
| P-04 | Session cookie auth + OIDC | **Session done**; OIDC specified (501) | Future (SSO) |
| P-05 | Durable webhook worker + delivery table | **Done** | — |
| P-06 | Flutter SDK implementation | **Dart client added** (not pub.dev certified) | Future polish |
| P-07 | Conformance test harness (OTV-0010) | **Done** (`pnpm conformance`) | — |
| P-08 | Observability metrics exporters | **Done** (`GET /v1/metrics`) | — |
| P-09 | Expand RFC bodies beyond templates | **Done** | — |
| P-10 | Legal licensing decision | Pending counsel | Docs |

Remaining non-blockers: cloud KMS provider, live OIDC, billing provider, extra chain adapters. See `docs/MVP_BOUNDARIES.md`.
