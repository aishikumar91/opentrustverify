# AGENTS.md

OpenTrust Verify (OTV) is a pnpm monorepo. The product answers one question: did this incoming chain event actually increase the recipient's spendable balance?

Tagline: Trust the balance, not just the blockchain event.

Parent brand is POP Trust. Canonical host is `https://otv.poptrust.me`. Local UI is `@otv/web` on port 4090. Local API is `@otv/api` on port 4080.

If this is your first time in the repo, read this file, then `README.md` and `docs/README.md`. Architecture maps are the Archify HTML under `docs/architecture/`. Do not treat `docs/GAP_ANALYSIS.md` as current. It is a 2026-08-25 snapshot. Postgres, Redis, live adapters, OIDC, and webhook delivery landed after that date. Prefer `docs/PENDING.md` and the code.

---

## Non-negotiables

1. Verification is deterministic. No LLM in the spendability path. Optional explanation only after a verdict exists.
2. Do not collapse states. Blockchain activity is not execution, is not a transfer, is not a balance increase, is not finality, is not spendable funds.
3. All RPC goes through `ChainAdapter` in `@otv/chain-adapters`. The engine never builds JSON-RPC itself.
4. Signing keys stay server-side. Clients verify signatures. They do not mint verdicts.
5. Production requires `DATABASE_URL`. `MemoryStore` is local and test only.
6. Trust states are the exact enum in `@otv/verdict-schema`. Do not invent synonyms in API or UI copy.

---

## Layout

```
apps/web                 @otv/web          Vite + React product UI (4090)
packages/verdict-schema  @otv/verdict-schema  Zod claim/verdict + transitions
packages/verification-engine  pipeline: claim → evidence → signed verdict
packages/chain-adapters  Ethereum/EVM, Bitcoin, Solana, Tron, mock
packages/crypto-signatures  canonical JSON → SHA-256 → Ed25519
packages/config          product name, ports, plan enum
packages/api-client      fetch client used by web and sdk-core
packages/sdk-core        OpenTrustVerify wrapper
packages/sdk-react       TanStack Query hooks
packages/ui              StatusBadge, TrustState, VerificationBadge, Explorer
packages/design-tokens   CSS tokens
packages/sdk-flutter     Dart client, not a certified pub.dev package
services/api             Fastify API, store, worker loop, OpenAPI
services/worker          alias: runs @otv/api worker
database/                Postgres schema, migrations, demo seed
infra/docker             compose (Postgres 5433, Redis 6380, API 4080)
tests/conformance        OTV-0010
docs/                    all product docs. Index: docs/README.md
docs/architecture/       Archify maps (runtime, verify, verdict, evidence)
```

Workspace globs are in `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `services/*`, `tests/*`.

---

## Runtime path

1. Client posts `IncomingClaim` to `POST /v1/verify/incoming` (`services/api/src/app.ts`).
2. API authenticates (Bearer / `X-OTV-Api-Key` or session cookie / `X-OTV-Session`).
3. `createAdapter(chain, network, rpcUrl)` picks a live adapter or mock.
4. `verifyIncomingTransfer` in `@otv/verification-engine` walks OBSERVED → PENDING → EXECUTED → ASSET_CONFIRMED → BALANCE_CONFIRMED → FINAL → SPENDABLE, or REJECTED / SUSPICIOUS / UNVERIFIED. Transitions are enforced by `assertTransition`.
5. Evidence items are required. Verdict schema id is `otv.verdict.v1`.
6. `@otv/crypto-signatures` signs the canonical payload. `kid` is on the verdict.
7. `PostgresStore` (or `MemoryStore`) persists the verdict. Webhooks enqueue on Redis when configured.

UI routes live in `apps/web/src/App.tsx`. Product, dashboard, verifier, docs, and wallet are one SPA. There is no Next.js app (ADR-002). There is no NestJS app (ADR-003).

---

## Stack

| Layer | Choice |
|---|---|
| Node | >= 20, pnpm 9 |
| UI | React 18, Vite, React Router 6, Tailwind, TanStack Query, Zod |
| API | Fastify 5, OpenAPI at `/api/docs` |
| Data | PostgreSQL 16 (SoT), Redis 7 (limits + queue) |
| Crypto | Ed25519, hex signatures in code |
| Tests | Vitest. `pnpm conformance` for OTV-0010 |

---

## Commands

```bash
pnpm install
pnpm --filter './packages/*' run build
pnpm docker:up                          # Postgres :5433, Redis :6380, API :4080
pnpm dev                                # API + web
pnpm --filter './packages/*' --filter @otv/api --filter @otv/conformance run test
pnpm demo
pnpm conformance
```

CI (`.github/workflows/ci.yml`) builds packages, runs those tests, runs `pnpm demo`, and fails if the Ethereum adapter still short-circuits to mock.

Env template is `.env.example`. Do not commit `.env`, `keys/*.pem`, or `infra/oidc/dex.yaml`.

---

## Where to edit

| Change | Own it here |
|---|---|
| Verdict shape, statuses, evidence types | `packages/verdict-schema` |
| Pipeline order / evidence collection | `packages/verification-engine` |
| New chain or RPC quirks | `packages/chain-adapters` |
| Signing / key store interface | `packages/crypto-signatures`, `services/api/src/lib/keys.ts` |
| HTTP routes, auth, webhooks, tenancy | `services/api/src/app.ts` + `lib/` |
| Schema | `database/migrations` then `database/schema` |
| Product UI | `apps/web` consuming `@otv/ui` |
| Public HTTP types | `packages/api-client`, then sdk-core / sdk-react |

`services/worker` has no separate runtime. It calls the API worker. Do not start a second implementation there.

---

## Gotchas

- **Stale gap analysis.** `docs/GAP_ANALYSIS.md` still says MemoryStore, unused Redis, always-mock Ethereum. Current `createStore()` uses Postgres when `DATABASE_URL` is set. `createAdapter` dispatches EVM / Bitcoin / Solana / Tron. Check `docs/CHAINS.md` for RPC env vars.
- **Docs live under `docs/`.** Start at `docs/README.md`. Root only keeps README, AGENTS, CONTRIBUTING, CHANGELOG, LICENSE, SECURITY, and TRADEMARK_POLICY.
- **Signature encoding.** Spec text has said base64url. Code emits hex (`packages/crypto-signatures`). Match the code unless you are changing the public contract on purpose, in which case update the spec and conformance tests together.
- **Mock confidence cap.** Offline / mock adapters cap confidence. Do not remove that to make demos look more certain.
- **OIDC.** Code is live. Endpoints return 501 until `OIDC_ISSUER` is set.
- **Public RPC.** Production can use public endpoints (`EVM_PUBLIC_RPC`). They rate-limit. Dedicated RPC is optional, not required to boot.
- **Browser demo signing.** Hosted verify path signs on the server. Do not add a new client-side keystore for production flows.
- **Tenancy.** `organizations` → `projects` → `api_keys` / `webhooks`. `PostgresStore` must keep row-level filters. Do not query across tenants.
- **Lockfiles.** `pnpm-lock.yaml` is the installer source of truth. Do not add npm lockfiles.

---

## Context Builder

This repo is packaged with [context-builder](https://github.com/igorls/context-builder) v0.10.0. Config is `context-builder.toml`.

```bash
context-builder --preview
context-builder --token-count
context-builder --max-tokens 120000 -y -o docs/handoffs/project-context/00-context.md
context-builder --signatures --structure -f ts -f tsx -f dart -f py -f sql -y -o docs/handoffs/project-context/01-signatures.md
```

Full filtered dump is about 129k tokens. Signatures mode is about 20k. After code changes, `--diff-only` (with `timestamped_output` + `auto_diff`) is the cheap update.

Do not point context-builder at home directories, `keys/`, or `.env` files. Review dumps before sharing. They can still contain demo secrets from `.env.example` and SQL seeds.

Details: `docs/handoffs/project-context/README.md`.
