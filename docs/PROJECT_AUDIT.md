# OpenTrust Verify — Project Audit

**Date:** 2026-08-25  
**Status:** Phase 1 complete  
**Parent brand:** POP Trust (Proof of Presence and Commitment)  
**Product:** OpenTrust Verify (OTV)  
**Suggested subdomain:** `verify.poptrust.me` (API: `api.verify.poptrust.me`)

---

## 1. Repository inspection

OTV is introduced as a **sibling product folder** inside the existing POP Trust repository (`proof-of-presence`), not a replacement of POP.

| Item | Finding |
|------|---------|
| Host repo | POP Trust — commitment / presence / escrow protocol |
| Host stack | React 18 + Vite + Tailwind + shadcn/ui + Supabase |
| Host auth | Supabase Auth |
| Host DB | Supabase Postgres + Edge Functions |
| Host brand | Electric blue interlocking-links mark, dark-first |
| OTV location | `/opentrust-verify/` (this monorepo) |
| OTV stack decision | Independent React+Vite frontend; NestJS/Fastify backend; own Postgres/Redis |

## 2. Existing stack (host) — do not reuse as OTV runtime

- **Frontend:** Vite, React Router, TanStack Query, Zod, RHF, Recharts, Framer Motion
- **UI:** Radix/shadcn component library (usable as design reference only)
- **Backend:** Supabase Edge Functions (Deno) — **not** the OTV backend
- **Blockchain today:** POP Anchor on Ethereum Sepolia for commitment anchoring — different problem domain
- **Env:** `VITE_SUPABASE_*` for POP only; OTV uses separate env under `opentrust-verify/`

## 3. Brand relationship

| | POP Trust | OpenTrust Verify |
|--|-----------|------------------|
| Category | Human promise / presence protocol | Digital-asset verification infrastructure |
| Tagline | Proof of Presence and Commitment | Trust the balance, not just the blockchain event |
| Logo | Shared interlocking-links mark | Same mark + OTV product wordmark |
| Subdomain | poptrust.me | verify.poptrust.me |
| Non-goal overlap | Does not verify spendable incoming transfers | Does not custody keys or replace wallets |

Logo assets copied from host into `brand/assets/`.

## 4. Gaps vs OTV requirements

| Requirement | Host status | OTV action |
|-------------|-------------|------------|
| Verdict schema + signed verdicts | Absent | New packages |
| Chain adapter abstraction | Absent (POP has anchor only) | New package |
| Verification engine pipeline | Absent | New service |
| NestJS/Fastify + Postgres + Redis | Supabase only | New services + Docker |
| Public verifier for incoming value | POP has public verify for commitments | New `/verifier` app |
| Wallet / explorer SDKs | POP developer API exists | New OTV SDKs |
| RFC / whitepaper for transfer trust | Absent | New docs |

## 5. Architecture audit (concise)

1. **Separation:** OTV is a self-contained monorepo under `opentrust-verify/` so POP and OTV can version and deploy independently.
2. **No Next.js:** Confirmed — Vite + React for all frontends.
3. **Deterministic verification first:** LLM/RAG optional and subordinate; never decides spendability.
4. **MVP chain:** Ethereum mainnet/sepolia via adapter; mock adapter for local demo without RPC keys.
5. **Signing keys:** Server-side only; local demo uses file-based Ed25519 with KMS interface for production.

## 6. Environment / deployment (host)

- Vercel SPA for POP (`vercel.json` rewrites)
- Supabase project already configured for POP
- OTV will use Docker Compose locally and containerized services for production

## 7. Tests (host)

- Host has limited automated coverage for POP features
- OTV introduces Vitest unit + integration suites from day one for verdict transitions and signatures

## 8. Decision

Proceed to Phase 2 specifications, then scaffold the OTV monorepo without modifying POP application code except for optional root README pointer.
