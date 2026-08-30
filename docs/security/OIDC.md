# Session and OIDC

## Session

HttpOnly cookie `otv_session` after `POST /v1/auth/login` or a successful SSO callback.

```bash
curl -c - -s http://localhost:4080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@poptrust.me","password":"otv-demo-change-me"}'
```

- Passwords: scrypt (`scrypt$N$r$p$salt$hash`)
- Tokens: 32-byte random, stored as SHA-256 in `sessions`
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production
- `SESSION_SECRET` required in production (at least 32 characters)

`GET /v1/auth/me`, `POST /v1/auth/logout`. Org, project, key, audit, and billing routes accept session or API key.

## SSO (authorization code + PKCE)

Disabled until both `OIDC_ISSUER` and `OIDC_CLIENT_ID` are set. Then:

1. `GET /v1/auth/oidc/status` returns `{ enabled: true, issuer }`
2. `GET /v1/auth/oidc/login?return_to=/dashboard` stores PKCE state in `otv_oidc` and redirects to the issuer
3. `GET /v1/auth/oidc/callback` exchanges the code, reads email from userinfo (or the id_token payload), creates or links the user, and issues `otv_session`

Optional: `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` (default `${OTV_PUBLIC_URL}/v1/auth/oidc/callback`), `OIDC_SCOPE`.

Without those env vars, login stays email/password and `/v1/auth/oidc/login` returns 501. Hosted OTV does not invent an identity provider.
