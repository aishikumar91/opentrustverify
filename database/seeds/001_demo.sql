INSERT INTO organizations (id, name) VALUES ('org_demo', 'OTV Demo Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (id, name) VALUES
  ('role_owner', 'owner'),
  ('role_admin', 'admin'),
  ('role_member', 'member')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, name) VALUES
  ('user_demo', 'demo@poptrust.me', 'OTV Demo Admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO memberships (id, organization_id, user_id, role_id) VALUES
  ('mem_demo', 'org_demo', 'user_demo', 'role_owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, organization_id, name) VALUES
  ('proj_demo', 'org_demo', 'Default Project')
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_keys (id, project_id, name, prefix, key_hash, scopes)
VALUES (
  'key_demo',
  'proj_demo',
  'Demo key',
  'otv_test_',
  encode(digest('otv_test_demo_key_change_me', 'sha256'), 'hex'),
  ARRAY['verify:write', 'verdicts:read', 'webhooks:write', 'admin']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chains (id, name) VALUES ('ethereum', 'Ethereum')
ON CONFLICT (id) DO NOTHING;

INSERT INTO networks (id, chain_id, name, finality_confirmations) VALUES
  ('ethereum-mainnet', 'ethereum', 'mainnet', 12),
  ('ethereum-sepolia', 'ethereum', 'sepolia', 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO assets (id, chain_id, type, contract, symbol, decimals) VALUES
  ('asset_usdc_eth', 'ethereum', 'erc20', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'USDC', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO policies (id, name) VALUES ('otv-policy', 'OTV Default Policy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO policy_versions (id, policy_id, version, body) VALUES
  ('otv-policy-1', 'otv-policy', 'otv-policy-1', '{"finalityRequired":true,"requireBalanceDelta":true}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO billing_accounts (id, organization_id, plan) VALUES
  ('bill_demo', 'org_demo', 'FREE')
ON CONFLICT (id) DO NOTHING;
