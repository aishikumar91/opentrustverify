-- Additive production columns for databases that already applied 001_core
-- before sessions, hmac secrets, and delivery payloads existed.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS hmac_secret TEXT;
UPDATE webhooks SET hmac_secret = 'migrated-rotate-me' WHERE hmac_secret IS NULL;
ALTER TABLE webhooks ALTER COLUMN hmac_secret SET NOT NULL;

ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_status INT;
CREATE INDEX IF NOT EXISTS webhook_deliveries_pending_idx
  ON webhook_deliveries(status, next_attempt_at)
  WHERE status IN ('pending', 'retrying');

ALTER TABLE signing_keys ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT;

CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_project_idx ON usage_events(project_id, created_at DESC);
