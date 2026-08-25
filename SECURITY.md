# SECURITY.md

## Reporting

Report vulnerabilities privately to security@poptrust.me (placeholder until public launch).

Do not file public issues for key material, auth bypasses, or signature forgery.

## Security model (MVP)

- API keys stored as SHA-256 hashes
- Helmet + CORS + rate limiting on API
- Zod validation on claims and verdicts
- Signing keys never shipped to clients
- Webhook HMAC signatures + idempotency keys
- Parameterized SQL in schema (API MVP uses memory store; Postgres migrations ready)
- Structured audit events for key creation

## Threat model

See `docs/THREAT_MODEL.md`.

## Production blockers (explicit)

| Item | Status |
|------|--------|
| HSM/KMS for signing keys | Interface only — file/in-memory for demo |
| Live multi-RPC consensus | Single adapter path; mock when RPC unset |
| Private-IP webhook SSRF guard | Documented; enforce in gateway before prod |
| OIDC/SSO | Architecture only |
| Dependency + container scanning in CI | Hook placeholders |

Never allow LLM output to decide whether money exists.
