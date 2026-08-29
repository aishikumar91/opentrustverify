import { createStore } from "./lib/create-store.js";
import { createRedis } from "./lib/redis.js";
import { popWebhookJob } from "./lib/queue.js";
import { processWebhookJob } from "./lib/webhooks.js";

const store = await createStore();
const redis = await createRedis();
if (!redis) {
  console.error("REDIS_URL is required for the webhook worker");
  process.exit(1);
}

console.log(`OTV webhook worker started (store=${store.backend})`);

while (true) {
  try {
    const job = await popWebhookJob(redis, 5);
    if (job) await processWebhookJob(store, redis, job);
  } catch (err) {
    console.error("worker_error", err);
    await new Promise((r) => setTimeout(r, 1000));
  }
}
