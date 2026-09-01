# AUTHORITY — 2026-09-01 context-build

**Verdict:** Implement the remaining in-scope product surface from the context dump. Do not re-wire Postgres, Redis, adapters, or OIDC. Those are already in the API.

**Why this slice.** `EXPLORER_INTEGRATION.md` names `VerdictCard`, `TransactionTrustPanel`, `EvidenceTimeline`, `SignatureVerification`, and `VerificationBadge`. They exist in `@otv/ui` (`packages/ui/src/components/Explorer.tsx`). The public verifier and demo wallet still invent their own markup, so the documented embedding path is not what a user sees.

**Out of scope:** payment billing, extra L1s, Flutter pub.dev, legal license, VPS env secrets.

## Ordered steps

1. Extend `VerdictCard` with amount and balance delta when present.
2. `apps/web/src/pages/Verifier.tsx` — compose the explorer primitives. Keep lookup + submit. Do not sign in the browser.
3. `apps/web/src/pages/Wallet.tsx` — keep RAW CHAIN ACTIVITY first, then OTV panel via `TransactionTrustPanel` + `VerdictCard` + `VerificationBadge`.
4. `.cursor/rules/otv-invariants.mdc` — alwaysApply, under 50 lines, the non-negotiables from `AGENTS.md`.
5. Gitignore `.context-builder/`.
6. Banner on `docs/GAP_ANALYSIS.md`: historical 2026-08-25, superseded by code + `docs/PENDING.md`.
7. `docs/PHASE_LOG.md` remaining list: VPS attach for KMS/OIDC, not "code missing."

## Verification

```
pnpm --filter @otv/ui --filter @otv/web run typecheck
```

Open `/verifier` and `/wallet`. Lookup empty state still works. A loaded verdict shows the OTV VERIFICATION panel, not a one-off card.
