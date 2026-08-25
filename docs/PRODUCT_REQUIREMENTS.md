# PRODUCT_REQUIREMENTS.md — OpenTrust Verify (OTV)

**Version:** 0.1.0-mvp  
**Status:** Approved for Phase 3+

## 1. Summary

OTV is vendor-neutral verification infrastructure that answers:  
**Does this incoming blockchain event represent verified value for this recipient?**

## 2. Users

| Persona | Need |
|---------|------|
| Wallet user | Clear spendable / not-spendable notification |
| Wallet engineer | SDK + hooks |
| Exchange / fintech | API + webhooks |
| Explorer engineer | Badge + trust panel |
| Security / compliance | Evidence + audit trail |
| Enterprise admin | Dashboard, keys, SSO path |

## 3. Functional requirements (MVP)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Submit incoming transfer claim | P0 |
| FR-02 | Lookup and verify execution | P0 |
| FR-03 | Verify asset identity | P0 |
| FR-04 | Verify recipient | P0 |
| FR-05 | Verify amount | P0 |
| FR-06 | Measure balance delta when possible | P0 |
| FR-07 | Evaluate finality (chain policy) | P0 |
| FR-08 | Evaluate spendability when possible | P0 |
| FR-09 | Separate risk signals from factual verdict | P0 |
| FR-10 | Sign verdict cryptographically | P0 |
| FR-11 | Public verifier UI | P0 |
| FR-12 | Dashboard overview + explorer | P0 |
| FR-13 | TypeScript SDK + React hooks | P0 |
| FR-14 | Demo wallet (no custody) | P0 |
| FR-15 | Webhooks (signed) | P1 |
| FR-16 | OpenAPI docs | P0 |
| FR-17 | Multi-chain adapters | P2 (interface P0) |

## 4. Non-functional

- WCAG 2.2 AA target
- Deterministic verification (no LLM decisions)
- Tenant isolation
- Rate limiting
- Structured logging + health checks
- Docker Compose local demo

## 5. Success metrics (MVP)

- End-to-end demo: claim → signed SPENDABLE/REJECTED verdict < 5s (mock) / RPC-dependent (live)
- Developer can run `pnpm demo` and complete Definition of Done checklist locally

## 6. Out of scope (MVP)

Custody, multi-chain production coverage, live payment billing, SSO, HSM, AI explanations in-product.
