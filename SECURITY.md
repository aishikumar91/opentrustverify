# SECURITY.md

## Reporting

Report vulnerabilities privately to security@poptrust.me (placeholder until public launch).

Do not file public issues for key material, auth bypasses, or signature forgery.

## Security model

- API keys stored as SHA-256 hashes
- Dashboard passwords: scrypt; sessions hashed; HttpOnly cookies
- Helmet + CORS + Redis (or in-process) rate limiting
- Zod validation on claims and verdicts
- Signing keys on disk, optional AES-256-GCM wrap; never shipped to clients
- Webhook HMAC signatures, idempotency keys, SSRF deny-list, durable retries
- Parameterized SQL via `pg`
- Structured audit events

## Threat model

See `docs/THREAT_MODEL.md`.

## Production checklist

| Item | Status |
|------|--------|
| Postgres source of truth | Required (`DATABASE_URL`) |
| Redis rate limits + webhook queue | Required for multi-instance |
| File keystore + `OTV_KMS_MASTER_KEY` | Required for wrapped keys |
| Cloud HSM | Next hardening — interface documented |
| Live multi-RPC consensus | Single Ethereum RPC path |
| OIDC/SSO | Specified; 501 until configured |
| Dependency + container scanning | Add in deploy pipeline |

Never allow LLM output to decide whether money exists.

## Honesty notes

- `MOCK_ADAPTER` is attached when live RPC is not used.
- `apps/web` browser demo signing is UI preview only.
- Session cookies + API keys are the MVP auth story; OIDC is future (`docs/security/OIDC.md`).
