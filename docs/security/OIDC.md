# Session and OIDC

## Implemented (MVP)

HttpOnly cookie `otv_session` after `POST /v1/auth/login`.

```bash
curl -c - -s http://localhost:4080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@poptrust.me","password":"otv-demo-change-me"}'
```

- Passwords: scrypt (`scrypt$N$r$p$salt$hash`)
- Tokens: 32-byte random, stored as SHA-256 in `sessions`
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production
- `SESSION_SECRET` required in production (≥32 chars)

`GET /v1/auth/me`, `POST /v1/auth/logout`. Org/project/key/audit/billing routes accept **session or API key**.

## OIDC (specified, not live)

`GET /v1/auth/oidc/login` returns **501** until `OIDC_ISSUER` + `OIDC_CLIENT_ID` are reviewed.

Intended flow: authorization code + PKCE against the issuer's discovery document, map `email` to `users`, issue the same `otv_session` cookie. SSO remains out of MVP per PRD §6.
