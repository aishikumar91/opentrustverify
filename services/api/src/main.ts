import { defaultPorts } from "@otv/config";
import { buildApp } from "./app.js";
import { createStore } from "./lib/create-store.js";
import { createKeyStore } from "./lib/keys.js";
import { createRedis } from "./lib/redis.js";

const store = await createStore();
const keyStore = await createKeyStore(store);
const redis = await createRedis();
const embedWorker = process.env.OTV_EMBED_WORKER !== "0";

const app = await buildApp({ store, keyStore, redis, embedWorker: embedWorker && Boolean(redis) });

const port = Number(process.env.PORT ?? defaultPorts.api);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`OTV API listening on http://${host}:${port}`);
  app.log.info(`OpenAPI UI: http://${host}:${port}/docs`);
  app.log.info(`Store backend: ${store.backend}; redis: ${Boolean(redis)}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
