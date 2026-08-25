# OpenTrust Verify — Gap Analysis

**Date:** 2026-08-25  
**Scope:** `opentrust-verify/` vs whitepaper + specs + code  
**Method:** Evidence-based file comparison only; no invented capabilities.

---

## A. White paper section coverage

Source: `docs/whitepaper/OTV_WHITEAPER.md` (filename typo: WHITE**APER**). Whitepaper is a short outline (~107 lines), not a full paper.

| § | Section | Status | Evidence |
|---|---------|--------|----------|
| 1 | Executive Summary | **Docs-only** | Claim stated in whitepaper + `README.md`; no product claim tests. Marketing copy in `apps/marketing`, `apps/web`. |
| 2 | Problem | **Docs-only** | Narrative in whitepaper, `docs/PROJECT_CONTEXT.md`; RFCs are stubs (`docs/rfc/OTV-0001.md`). |
| 3 | Why Existing UX Fails | **Docs-only** | Whitepaper + competitor notes; demo wallet shows “raw vs verified” UI (`apps/demo-wallet`, `apps/web/src/pages/DemoWallet.tsx`). |
| 4 | Threat Model | **Partial** | Spec: `docs/THREAT_MODEL.md`. Partial mitigations: hashed keys (`services/api/src/lib/store.ts`), Helmet/rate-limit (`services/api/src/main.ts`), HMAC webhooks (`services/api/src/lib/webhooks.ts`). Missing: Redis rate limits, SSRF guard, multi-RPC. |
| 5 | Vision | **Docs-only** | Positioning only (`docs/PROJECT_CONTEXT.md`, marketing apps). |
| 6 | Design Principles | **Partial** | Non-collapse states in `packages/verdict-schema`; deterministic engine in `packages/verification-engine`. No LLM path (good). Evidence required — implemented. Adapter policies — mock only. |
| 7 | Verification Model | **Implemented** (mock path) | Pipeline in `packages/verification-engine/src/index.ts` matches claim→…→signed verdict. Live chain lookup **not** implemented (see §9 / ethereum placeholder). |
| 8 | Trust States | **Implemented** | Exact enum in `packages/verdict-schema/src/index.ts` + `docs/VERDICT_SPEC.md`; UI `StatusBadge`/`TrustState` in `packages/ui`. |
| 9 | Architecture | **Partial** | Fastify API + engine package + adapters + frontends exist. Postgres schema exists but **API ignores it**. Redis in Compose but **unused by API**. Architecture diagram claims PG/Redis (`docs/ARCHITECTURE.md`). |
| 10 | Signed Verdicts | **Partial** | `otv.verdict.v1`, canonical JSON, SHA-256, Ed25519, `kid` in `packages/crypto-signatures`. Spec says **base64url** signature (`docs/VERDICT_SPEC.md` L75); code emits **hex**. Rotation API exists on keystore class; production persistence/KMS missing. |
| 11 | Wallet Integration | **Partial** | `OpenTrustVerify.verifyIncomingTransfer` in `packages/sdk-core`; React hooks in `packages/sdk-react`; demo wallet apps. No published wallet profile conformance tests (`docs/rfc/OTV-0006.md` stub). |
| 12 | Explorer Integration | **Missing** | `EXPLORER_INTEGRATION.md` names components; **no** `VerificationBadge`, `TransactionTrustPanel`, `EvidenceTimeline`, `VerdictCard`, or `SignatureVerification` packages/components found (only generic UI + StatusBadge). |
| 13 | API | **Partial** | Routes in `services/api/src/main.ts` largely match `docs/API_SPEC.md`. OpenAPI via Fastify swagger. Auth gaps: “session” endpoints unauthenticated; verdict GET unauthenticated; no public-token model. |
| 14 | SDK | **Partial** | TS core + React implemented; Flutter is stub (`packages/sdk-flutter`). |
| 15 | Security | **Partial** | Hashed keys, rate limit (in-process), webhook HMAC, server signing (API path). Documented blockers in `SECURITY.md`. Browser demo mode signs in-client (`apps/web/src/lib/otv.ts`) — conflicts with “keys never in client” for that path. |
| 16 | Privacy | **Partial** | Minimal PII by design; **no** durable tenant isolation (memory store; no row-level Postgres queries). |
| 17 | Governance | **Docs-only** | `docs/governance/GOVERNANCE.md` + 10 RFCs that are near-identical stubs. **No** conformance suite code (`docs/rfc/OTV-0010.md` pointer only). |
| 18 | Licensing | **Docs-only** | `LICENSE.md`, `docs/governance/LICENSING.md`; legal review deferred (ADR-009). |
| 19 | Business Model | **Partial** | Plan enum + `GET /v1/billing` stub (`services/api/src/main.ts`); no metering persistence / payment provider. |
| 20 | Adoption | **Docs-only** | Marketing pages; no sandbox program, partner profiles, or conformance gates. |
| 21 | Roadmap | **Partial** | Roadmap text matches reality: mock MVP done; multi-chain/KMS/SSO/certification not done. Misleading if PHASE_LOG “COMPLETE” is read as production-ready. |
| 22 | Research | **Partial** | `docs/research/COMPETITOR_ANALYSIS.md` present; marks **RESEARCH REQUIRED** for pricing/adoption stats. |
| 23 | Limitations | **Implemented** (as documentation of truth) | Whitepaper correctly notes mock/offline, confidence cap, billing abstracted — matches code. |
| 24 | Conclusion | **Docs-only** | Tagline + **RESEARCH REQUIRED** for TAM/SAM. |

---

## B. Spec vs implementation mismatches

| Spec claim | Implementation | Paths |
|------------|----------------|-------|
| Postgres is source of truth; Redis for cache/locks/rate limits/queues (ADR-004, ARCHITECTURE) | API uses `MemoryStore` only; `DATABASE_URL` / `REDIS_URL` never read in TS | `services/api/src/lib/store.ts`, `services/api/src/main.ts`, `.env.example`, `infra/docker/docker-compose.yml` |
| Ethereum adapter live when `ETH_RPC_URL` set; mock when unset (PHASE_LOG, SECURITY, ethereum.ts comments) | `ensure()` **always** returns `this.mock`, even when `rpcUrl` is set | `packages/chain-adapters/src/ethereum.ts` L25–28 |
| Signature encoding: base64url (VERDICT_SPEC) | Hex via `bytesToHex` | `docs/VERDICT_SPEC.md` L75 vs `packages/crypto-signatures/src/index.ts` L51–54 |
| Session cookie auth for orgs/projects/api-keys/audit/billing (API_SPEC) | Those routes have **no** session/cookie/OIDC checks | `docs/API_SPEC.md` L10–11, L25–30 vs `services/api/src/main.ts` L136–174 |
| `GET /v1/verdicts/:id` — API key / public token | No auth; anyone with ID can read | `docs/API_SPEC.md` L17 vs `services/api/src/main.ts` L93–97 |
| Redis rate limits (THREAT_MODEL) | `@fastify/rate-limit` in-memory (120/min) | `docs/THREAT_MODEL.md` L30 vs `services/api/src/main.ts` L21 |
| Webhook retries with idempotency (THREAT_MODEL) | Single `fetch` attempt; failures swallowed; comment defers to worker | `services/api/src/lib/webhooks.ts` L41–43; `services/worker` stub |
| SSRF: allowlist / block private IPs | Comment only: “block private IPs in production gateway” | `services/api/src/lib/webhooks.ts` L26; `SECURITY.md` |
| File-based Ed25519 for demo + KMS interface (PROJECT_AUDIT, SECURITY) | `InMemoryKeyStore` only; `keys/` is empty `.gitkeep`; no KMS interface type beyond in-memory class | `services/api/src/lib/keys.ts`, `packages/crypto-signatures`, `keys/` |
| Docs claim “Redis-ready” rate limits | Same as above — not wired | `apps/docs/src/App.tsx` rate-limits blurb |
| Schema `webhooks.secret_hash` | Memory store keeps plaintext `secret` and returns it once (OK for create) but never hashes for persistence | `database/schema/001_core.sql` L140–147 vs `store.ts` / `main.ts` webhook create |
| Signing keys never shipped to clients (SECURITY, ADR) | `apps/web` demo mode generates/signs with browser `InMemoryKeyStore` | `apps/web/src/lib/otv.ts` L14–47 |
| PHASE_LOG “Live JSON-RPC eth_ methods: interface ready; mock used when RPC unset” | Interface ready, but live path not implemented even when RPC set | `docs/PHASE_LOG.md` vs `ethereum.ts` |
| Root pointers vs full docs | Root `PRODUCT_REQUIREMENTS.md` etc. are 1-line pointers; real content under `docs/` | Root stubs vs `docs/*` |
| CI paths `opentrust-verify/**` | Correct for host monorepo layout; OK if workflows live at repo root | `.github/workflows/ci.yml` |
| Docker API prod CMD | Runs `node --import tsx src/main.ts` (source + tsx), not compiled `dist` | `infra/docker/Dockerfile.api` L18 |
| NestJS | Out of scope (ADR-003) — **not** a gap; Fastify is correct | `docs/ARCHITECTURE_DECISIONS.md` |

---

## C. Missing implementations (architecture gaps)

| Subsystem | Status | Severity |
|-----------|--------|----------|
| DB persistence (Postgres wired to API) | Schema + migrations + seeds + Compose volume mount; API never connects | **blocker** (for any durable MVP / multi-instance) |
| Redis (cache, locks, rate limits, queues) | Compose service only; unused | **mvp-gap** |
| NestJS | Intentionally not used (Fastify) | N/A (correct) |
| Fastify API | Present; core verify path works offline | Implemented (mock) |
| Auth / OIDC / session | API keys hashed in memory; no login/SSO/OIDC | **mvp-gap** (dashboard trust); OIDC = **future** per PRD out-of-scope |
| Webhook retries / delivery table | Inline fire-and-forget; `webhook_deliveries` table unused; `services/webhook-service` stub | **mvp-gap** |
| Live RPC (Ethereum JSON-RPC) | Explicit PLACEHOLDER; always mock | **blocker** for credibility as chain verifier |
| KMS / HSM | In-memory only; no file keystore despite docs | **mvp-gap** for demo hardening; **blocker** for prod |
| Billing | Stub endpoint + plans enum | **future** (PRD out of scope for live payment) |
| Flutter SDK | Stub README/package | **future** (whitepaper admits stub) |
| Explorer components | Doc list only; no components | **mvp-gap** (FR explorer persona / whitepaper §12) |
| RAG / LLM explanation layer | Absent (correct for MVP; ADR-008) | **future** |
| CI | Build + package tests + `pnpm demo`; no e2e/integration under `tests/`; empty `infra/monitoring` | **mvp-gap** |
| Observability metrics | `OPERATIONS.md` lists metrics; no exporters/instrumentation; empty `infra/monitoring/` | **mvp-gap** |
| Standalone services (indexer, risk, worker, webhook, verification-engine service) | Package.json `echo stub` only | **future** (acceptable as boundaries if documented) |
| Conformance suite | RFC-0010 + governance mention; no tests/harness | **future** |
| Multi-chain adapters | Interface + ethereum/mock only | **future** (FR-17 P2) |
| Tenant isolation / audit durability | Memory Maps; audit array lost on restart | **blocker** for enterprise claims |
| `tests/e2e`, `tests/integration`, `tests/unit` | Empty directories | **mvp-gap** |
| `infra/deployment` | Empty | **future** |

---

## D. Code inconsistencies

1. **Ethereum live path is a no-op:** `return this.mock` on both branches (`packages/chain-adapters/src/ethereum.ts`). Setting `ETH_RPC_URL` changes confidence cap in API (`maxConfidence: 0.99`) but **not** evidence source — false sense of “live.”
2. **Hardcoded localhost in deployable multi-app frontends:**  
   - `apps/marketing/src/App.tsx` → `http://localhost:4081/4082`  
   - `apps/verifier`, `apps/docs`, `apps/demo-wallet` → `Logo href="http://localhost:4083/"`  
   - `apps/web` uses relative `/` (better for Vercel). Dual app trees diverge.
3. **Duplicate frontend surfaces:** Separate Vite apps (`marketing`, `dashboard`, `verifier`, `demo-wallet`, `docs`) **and** unified `apps/web`. Risk of drift (already: localhost vs relative links; web has in-browser signing).
4. **Duplicate verification-engine naming:** package `@otv/verification-engine` vs service stub `@otv/verification-engine-service` — easy to confuse with “complete service.”
5. **Stub services always “pass” build/test** via `echo stub` — CI green does not mean those packages exist.
6. **Schema without API wiring:** All tables in `database/schema/001_core.sql` unused by runtime (orgs, verdicts, webhooks, signing_keys, usage_events, billing_accounts, etc.).
7. **Identical schema copies:** `database/schema/001_core.sql` and `database/migrations/001_core.sql` (203 lines each) — duplication risk.
8. **Signature encoding mismatch** (hex vs base64url) — interoperability bug vs VERDICT_SPEC.
9. **OpenAPI server URL** hardcoded to localhost (`services/api/src/main.ts` L29).
10. **Dockerfile.api:** no `pnpm-lock.yaml` copy in deps stage snippet; runs TS source with tsx in production image rather than `node dist/main.js`.
11. **Empty `keys/`** while docs mention file-based keys.
12. **Whitepaper filename typo:** `OTV_WHITEAPER.md`.
13. **Root doc stubs** vs `docs/` — convention compliance, but several roots (e.g. `OPERATIONS.md`, `EXPLORER_INTEGRATION.md`) are thin originals, not pointers to fuller docs.
14. **Browser signing in `@otv/web` demo mode** vs security model for production signing.
15. **No broken package imports found** in core packages (imports resolve within workspace); inconsistency is stub/placeholder vs claimed completeness, not missing modules.

---

## E. Pending docs to create

| Needed doc | Current state |
|------------|---------------|
| Full `docs/api/API_REFERENCE.md` | 1-line pointer to API_SPEC + OpenAPI |
| Full `OPERATIONS.md` (SLOs, metric defs, dashboards, alert runbooks) | Metric name list only (`OPERATIONS.md`) |
| Full `WALLET_INTEGRATION.md` | Root pointer to short `docs/sdk/SDK_GUIDE.md` |
| Full `EXPLORER_INTEGRATION.md` (component API, props, embedding) | One sentence listing component names |
| `CHAIN_ADAPTER_SPEC.md` | One sentence; real types live in code only |
| Conformance suite doc + harness | RFC-0010 stub; GOVERNANCE mentions suite; **no** `tests/conformance` |
| Per-RFC substantive specs (OTV-0001…0010) | Template stubs (~29 lines each) cross-linking core docs |
| KMS / key-management runbook | SECURITY table only |
| Webhook delivery & retry contract | Implicit in code comments |
| Session/OIDC auth design | Out of MVP but API_SPEC already references session |
| Metrics/observability design under `infra/monitoring/` | Empty directory |
| Deployment runbook under `infra/deployment/` | Empty directory |
| Honest “MVP boundaries” page | Spread across PHASE_LOG / SECURITY; easy to miss vs “COMPLETE” language |
| Fix whitepaper filename / expand whitepaper | Outline-only; filename typo |

---

## F. Recommended fix order (MVP credibility)

Prioritized for **this session / near-term** — credibility over greenfield features:

1. **Fix Ethereum adapter honesty** — Either implement minimal JSON-RPC (`eth_getTransactionByHash`, receipt, logs, balance) behind `ETH_RPC_URL`, or change API/docs so `ETH_RPC_URL` does not raise confidence / claim live mode while still mocking. *(blocker)*
2. **Align VERDICT_SPEC signature encoding with code** (pick hex **or** base64url; update spec + tests). *(interop)*
3. **Wire Postgres for verdicts + API keys** (even thin `pg` client) so Compose `DATABASE_URL` is real; stop claiming PG as runtime SoT until done. *(blocker for durable demo)*
4. **Remove or gate localhost hardcodes** in `apps/marketing|verifier|docs|demo-wallet` (use relative URLs or env), or deprecate multi-app in favor of `apps/web` for deploy. *(deploy)*
5. **Document browser demo signing** as non-production / or disable client signing outside explicit demo flag with warning. *(security narrative)*
6. **Auth truth in API_SPEC** — Mark org/project/key routes as “unauthenticated demo” or add minimal API-key guard; don’t claim session cookies. *(docs/code)*
7. **Webhook SSRF deny-list + retry stub** (queue table or in-memory retry) matching threat model language. *(mvp-gap)*
8. **Explorer UI primitives** — Add at least `VerificationBadge` + `VerdictCard` in `@otv/ui` matching `EXPLORER_INTEGRATION.md`. *(product gap)*
9. **Fill `docs/api/API_REFERENCE.md`**, expand OPERATIONS metrics meanings, expand wallet/explorer guides beyond pointers. *(docs)*
10. **CI:** add job that fails if `ethereum.ts` still double-returns mock while README claims live RPC; add one integration test hitting `/v1/verify/incoming`. *(quality)*
11. **Defer:** OIDC, KMS, Flutter, RAG, conformance certification, multi-chain, billing provider, standalone microservices.

---

## RESEARCH REQUIRED

- Market sizing / TAM-SAM before public claims (whitepaper §24).
- Competitor pricing pages and partnership lists before sales materials (`docs/research/COMPETITOR_ANALYSIS.md`).
- Legal review for licensing split (protocol vs hosted) — ADR-009.
- Whether host-repo CI path filters run correctly when changes are only under `opentrust-verify/` on branch workflows (verify on next PR).

---

## Summary verdict

OTV has a **credible offline/mock MVP spine**: verdict schema, transition rules, Ed25519 signing, Fastify verify API, mock adapter, TS/React SDKs, and UI shells. Architecture docs and PHASE_LOG overstate production readiness: **Postgres/Redis are not used by the API**, **live Ethereum RPC is a placeholder that always mocks**, **explorer integration components are missing**, **session auth is unspecified in code**, and several security controls exist only as comments. Treat current state as **demo-grade verification UX + protocol sketch**, not hosted verification infrastructure.
