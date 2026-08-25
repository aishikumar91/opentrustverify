# Architecture Decision Records (ADR)

## ADR-001: Sibling monorepo folder (not fork)

**Decision:** Build OTV under `opentrust-verify/` inside the POP Trust repo.  
**Why:** Shared brand/IP ownership; independent deployables; clear product boundary.  
**Consequence:** Root README links to OTV; POP app code untouched.

## ADR-002: No Next.js

**Decision:** React + Vite + React Router for all frontends.  
**Why:** Explicit product requirement; aligns with POP frontend skills.  
**Consequence:** SPA hosting + API reverse proxy; docs as Vite app (or static MD renderer).

## ADR-003: TypeScript + Fastify API

**Decision:** Production backend is **TypeScript on Fastify** — not NestJS.  
**Why:** Clean TypeScript service, first-class OpenAPI, low ceremony, modular `src/` layout.  
**Status:** Accepted. NestJS is out of scope for OTV.

## ADR-004: PostgreSQL source of truth + Redis coordination

**Decision:** Postgres for all durable state; Redis for cache, locks, rate limits, queues.  
**Why:** Matches requirement; avoids Redis-as-DB anti-pattern.

## ADR-005: Chain adapter abstraction

**Decision:** All RPC behind `ChainAdapter`; business logic never calls RPC directly.  
**MVP:** `ethereum` adapter + `mock` adapter for offline demos.

## ADR-006: Ed25519 signed verdicts

**Decision:** Canonical JSON → SHA-256 → Ed25519 signature; `kid` + rotation metadata.  
**Why:** Compact, widely supported; KMS/HSM interface for production.

## ADR-007: Verification states are explicit enums

**Decision:** Implement exact states: OBSERVED, PENDING, EXECUTED, ASSET_CONFIRMED, BALANCE_CONFIRMED, FINAL, SPENDABLE, REJECTED, SUSPICIOUS, UNVERIFIED.  
**Why:** Product requirement; prevents collapsing concepts.

## ADR-008: AI subordinate to deterministic engine

**Decision:** No LLM in the spendability path. Optional explanation layer only after verdict.

## ADR-009: Licensing deferred

**Decision:** Proprietary / all-rights-reserved pending legal review; evaluate Apache-2.0 for protocol schemas later.  
**See:** `LICENSE.md`, `docs/governance/LICENSING.md`.

## ADR-010: Brand subdomain

**Decision:** Product lives at `verify.poptrust.me` (not a separate trademark site for MVP).
