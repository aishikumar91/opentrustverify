INSERT INTO organizations (id, name) VALUES ('org_demo', 'OTV Demo Org');
INSERT INTO roles (id, name) VALUES ('role_owner', 'owner'), ('role_admin', 'admin'), ('role_member', 'member');
INSERT INTO projects (id, organization_id, name) VALUES ('proj_demo', 'org_demo', 'Default Project');
INSERT INTO chains (id, name) VALUES ('ethereum', 'Ethereum');
INSERT INTO networks (id, chain_id, name, finality_confirmations) VALUES
  ('ethereum-mainnet', 'ethereum', 'mainnet', 12),
  ('ethereum-sepolia', 'ethereum', 'sepolia', 12);
INSERT INTO policies (id, name) VALUES ('otv-policy', 'OTV Default Policy');
INSERT INTO policy_versions (id, policy_id, version, body) VALUES
  ('otv-policy-1', 'otv-policy', 'otv-policy-1', '{"finalityRequired":true,"requireBalanceDelta":true}');
INSERT INTO billing_accounts (id, organization_id, plan) VALUES ('bill_demo', 'org_demo', 'FREE');
