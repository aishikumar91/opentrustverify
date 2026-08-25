---
type: analysis
title: OTV Codebase Realization (Claude Obsidian)
status: developing
created: 2026-08-25
updated: 2026-08-25
tags:
  - otv
  - architecture
  - gap-analysis
sources:
  - "[[OTV Whitepaper]]"
  - "[[Gap Analysis 2026-08-25]]"
---

# OTV Codebase Realization

## Observed

- Monorepo under `opentrust-verify/` with TypeScript Fastify API, verification engine, adapters, SDKs, and React/Vite apps.
- Deterministic pipeline and `otv.verdict.v1` are implemented for the mock path and now live Ethereum JSON-RPC when `ETH_RPC_URL` is set.
- Explorer UI components were missing; now present in `@otv/ui`.
- Postgres schema exists but API MemoryStore remains the default runtime store.

## Inferred

- MVP is credible for offline demos and UI/UX preview; production durability requires Postgres wiring (P-01).

## Unknown

- Live RPC behavior against specific public endpoints (needs operator-provided `ETH_RPC_URL`).
- Legal licensing choice (ADR-009).

## Decisions applied this session

1. Align signature encoding docs to hex.
2. Implement live Ethereum JSON-RPC path (no longer always-mock).
3. Disclose mock usage via `MOCK_ADAPTER` risk signal.
4. Add webhook SSRF deny-list + retries.
5. Gate enterprise routes with API keys until session/OIDC.
6. Expand whitepaper + pending docs tracker.
7. Add explorer components.

## Links

- [[Gap Analysis 2026-08-25]]
- [[Pending Work]]
- [[OTV Whitepaper]]
