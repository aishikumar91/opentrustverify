-- OpenTrust Verify core schema (PostgreSQL)
-- Tenant isolation via organization_id / project_id FKs

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX api_keys_hash_idx ON api_keys(key_hash);

CREATE TABLE chains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE networks (
  id TEXT PRIMARY KEY,
  chain_id TEXT NOT NULL REFERENCES chains(id),
  name TEXT NOT NULL,
  finality_confirmations INT NOT NULL DEFAULT 12
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  chain_id TEXT NOT NULL REFERENCES chains(id),
  type TEXT NOT NULL,
  contract TEXT,
  symbol TEXT,
  decimals INT
);

CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  address TEXT NOT NULL,
  label TEXT,
  UNIQUE (project_id, address)
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  chain_id TEXT NOT NULL,
  network_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  UNIQUE (chain_id, network_id, hash)
);

CREATE TABLE transaction_observations (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL
);

CREATE TABLE balance_observations (
  id TEXT PRIMARY KEY,
  wallet_id TEXT REFERENCES wallets(id),
  asset_id TEXT REFERENCES assets(id),
  block_number BIGINT,
  balance NUMERIC NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE verification_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  claim JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE verification_verdicts (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES verification_requests(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  status TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  verdict JSONB NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX verdicts_project_idx ON verification_verdicts(project_id, checked_at DESC);
CREATE INDEX verdicts_status_idx ON verification_verdicts(status);

CREATE TABLE evidence_records (
  id TEXT PRIMARY KEY,
  verdict_id TEXT NOT NULL REFERENCES verification_verdicts(id),
  type TEXT NOT NULL,
  result BOOLEAN NOT NULL,
  detail TEXT
);

CREATE TABLE risk_signals (
  id TEXT PRIMARY KEY,
  verdict_id TEXT NOT NULL REFERENCES verification_verdicts(id),
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL
);

CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  events TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id),
  event TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE signing_keys (
  kid TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE policy_versions (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES policies(id),
  version TEXT NOT NULL,
  body JSONB NOT NULL,
  UNIQUE (policy_id, version)
);

CREATE TABLE usage_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  kind TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE billing_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  plan TEXT NOT NULL DEFAULT 'FREE',
  provider TEXT NOT NULL DEFAULT 'abstracted'
);
