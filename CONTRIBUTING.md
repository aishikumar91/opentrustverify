# CONTRIBUTING.md

## Scope

Contributions to OpenTrust Verify should preserve:

1. Deterministic verification (no AI spendability decisions)
2. Explicit trust states and evidence
3. Chain adapter boundaries
4. Accessibility and documentation quality

## Workflow

1. Open an issue describing the change
2. Keep PRs phase-aligned (schema, engine, API, UI)
3. Add tests for verdict transitions, signatures, and adapters
4. Update RFCs when changing public contracts

## Local checks

```bash
pnpm install
pnpm --filter './packages/*' run build
pnpm --filter './packages/*' --filter @otv/api run test
pnpm demo
```

## Code of conduct

Be precise, respectful, and security-conscious. Do not commit secrets.
