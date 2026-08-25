# Deployment

1. Build packages: `pnpm --filter './packages/*' run build`
2. Run API with `PORT`, optional `ETH_RPC_URL`, `DATABASE_URL`, `REDIS_URL`
3. Deploy frontends as static Vite builds behind reverse proxy
4. Map `verify.poptrust.me`, `api.verify.poptrust.me`, `docs.verify.poptrust.me`

Production blockers: KMS, SSRF webhook guard, live RPC HA — see SECURITY.md.
