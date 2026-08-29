# PostgreSQL — OpenTrust Verify

Postgres 16 is the **source of truth** for tenants, API keys, verdicts, evidence, webhooks, sessions, audit, usage, and signing-key metadata.

## Layout

| Path | Role |
|------|------|
| `database/schema/001_core.sql` | Canonical DDL |
| `database/migrations/001_core.sql` | Applied by Docker init + API migrator |
| `database/migrations/002_production.sql` | Additive ALTERs for older volumes |
| `database/seeds/001_demo.sql` | Demo org/project/key/user |

## Boot

`@otv/api` runs migrations on startup when `DATABASE_URL` is set (`services/api/src/lib/migrate.ts`). Production refuses to start without `DATABASE_URL`.

```bash
pnpm docker:up
pnpm db:migrate
pnpm --filter @otv/api run dev
```

Local ports: Postgres `5433`, Redis `6380`.

## Tenancy

Every durable verification row is keyed by `project_id` → `organization_id`. API keys hash-lookup to a project. Dashboard sessions bind to `users` + `memberships`.

## Demo seed

- Org `org_demo` / project `proj_demo`
- API key `otv_test_demo_key_change_me` (SHA-256 hashed)
- User `demo@poptrust.me` — password set on first API `ready()` (`DEMO_PASSWORD`, default `otv-demo-change-me`)
