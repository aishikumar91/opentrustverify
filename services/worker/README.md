# worker

Alias for the API webhook worker. There is no separate runtime here.

```bash
pnpm --filter @otv/api run worker
# or
pnpm --filter @otv/worker run start
```

Compose uses `infra/docker/Dockerfile.worker`. Set `OTV_EMBED_WORKER=0` on the API when this process is deployed separately.

Queue: `services/api/src/lib/queue.ts`. Delivery: `services/api/src/lib/webhooks.ts`. Process: `services/api/src/worker.ts`. Contract: `docs/webhooks/DELIVERY.md`.
