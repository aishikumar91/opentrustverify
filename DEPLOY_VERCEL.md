# OpenTrust Verify — frontend deploy

The canonical UI is `apps/web`. It talks to the Fastify API. There is no in-browser signing path.

## Routes

| Path | Surface |
|------|---------|
| `/` | Product home |
| `/login` `/register` | Auth |
| `/about` `/whitepaper` `/security` `/contact` | Public product pages |
| `/docs` | Developer docs |
| `/verifier` | Public verdict lookup + authenticated verify |
| `/dashboard` | Keys, verifications, webhooks, billing, audit |
| `/wallet` | Wallet integration profile |

## Env

| Variable | Purpose |
|----------|---------|
| `VITE_OTV_API_URL` | Fastify API base (required for a working UI) |

Session tokens from login/register are stored as `otv_session_token` and sent as `X-OTV-Session`.

## Local

```bash
pnpm install
pnpm --filter './packages/*' run build
pnpm dev:web
```
