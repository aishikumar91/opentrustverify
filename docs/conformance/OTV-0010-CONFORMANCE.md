# OTV-0010 Conformance (Draft Harness Spec)

## Purpose

Gate “OTV Compatible” claims. Certification marks require separate authorization.

## Suites

1. **Verdict schema** — parse `otv.verdict.v1`; reject unknown status.
2. **Transitions** — happy path + failure paths only.
3. **Signatures** — sign/verify round-trip; tamper fails.
4. **Evidence** — every SPENDABLE verdict includes required evidence types.
5. **Adapter** — mock normalizeEvidence deterministic for demo hash.
6. **API** — OpenAPI paths exist; unauthorized verify returns 401.

## Run (MVP)

```bash
pnpm --filter './packages/*' --filter @otv/api run test
pnpm demo
```

Automated conformance CLI is **pending** (`docs/PENDING.md` P-07).
