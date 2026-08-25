# OpenTrust Verify — Vercel frontend preview

Deploy the unified UI app (`apps/web`) for UI/UX testing.

## Routes on one URL

| Path | Surface |
|------|---------|
| `/` | Marketing |
| `/verifier` | Public verifier |
| `/dashboard` | Enterprise dashboard |
| `/demo` | Demo wallet |
| `/docs` | Developer docs |

## Preview behavior

By default `VITE_OTV_DEMO_MODE` is on when no API URL is set. Verification runs **in-browser** (mock chain + Ed25519) so the UI is fully testable without deploying the Fastify API.

## Deploy from this folder

```bash
cd opentrust-verify
pnpm install
pnpm --filter @otv/web run build   # local check
vercel link                        # rootDirectory = opentrust-verify
vercel --yes                       # preview
vercel --prod --yes                # production
```

### Vercel project settings (if linking in dashboard)

- **Root Directory:** `opentrust-verify`
- **Framework:** Vite
- **Install:** `pnpm install`
- **Build:** (from `vercel.json`) builds packages + `@otv/web`
- **Output:** `apps/web/dist`

### Optional env

| Variable | Purpose |
|----------|---------|
| `VITE_OTV_DEMO_MODE=true` | Force in-browser verification |
| `VITE_OTV_API_URL` | Point UI at a live API |
| `VITE_OTV_API_KEY` | API key when using live API |

## Local preview of production build

```bash
cd opentrust-verify
pnpm --filter './packages/*' --filter @otv/web run build
pnpm --filter @otv/web run preview
# http://localhost:4090
```
