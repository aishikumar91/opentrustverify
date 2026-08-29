# webhook-service

Durable webhook delivery worker. Implementation lives in `@otv/api`:

- Queue protocol: `services/api/src/lib/queue.ts`
- Delivery + SSRF: `services/api/src/lib/webhooks.ts`
- Process: `services/api/src/worker.ts`

```bash
pnpm --filter @otv/api run worker
```

Compose runs the worker image (`infra/docker/Dockerfile.worker`). Set `OTV_EMBED_WORKER=0` on the API when this process is deployed separately.

Contract: `docs/webhooks/DELIVERY.md`.
