import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { product, defaultPorts } from "@otv/config";
import { IncomingClaimSchema, VerdictSchema } from "@otv/verdict-schema";
import { createAdapter } from "@otv/chain-adapters";
import { verifyIncomingTransfer } from "@otv/verification-engine";
import { verifyPayload } from "@otv/crypto-signatures";
import { store, DEMO_API_KEY } from "./lib/store.js";
import { keyStore } from "./lib/keys.js";
import { dispatchWebhooks, mapStatusToEvent } from "./lib/webhooks.js";
import { randomBytes } from "node:crypto";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
await app.register(swagger, {
  openapi: {
    info: {
      title: "OpenTrust Verify API",
      description: product.tagline,
      version: "0.1.0",
    },
    servers: [{ url: `http://localhost:${defaultPorts.api}` }],
  },
});
await app.register(swaggerUi, { routePrefix: "/docs" });

function requireApiKey(headerAuth?: string, headerKey?: string) {
  const raw = headerKey || headerAuth?.replace(/^Bearer\s+/i, "");
  const key = store.authenticate(raw);
  if (!key) {
    const err = new Error("Unauthorized");
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }
  return key;
}

app.get("/v1/health", async () => ({
  status: "ok",
  product: product.name,
  shortName: product.shortName,
  tagline: product.tagline,
  domain: product.domain,
  time: new Date().toISOString(),
}));

app.get("/v1/openapi.json", async () => app.swagger());

app.get("/v1/chains", async () => [
  { id: "ethereum", networks: ["mainnet", "sepolia"], adapter: "ethereum" },
  { id: "mock", networks: ["local"], adapter: "mock" },
]);

app.get("/v1/networks", async () => [
  { chain: "ethereum", id: "mainnet", finalityConfirmations: 12 },
  { chain: "ethereum", id: "sepolia", finalityConfirmations: 12 },
]);

app.get("/v1/assets", async () => [
  {
    chain: "ethereum",
    type: "erc20",
    symbol: "USDC",
    contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    decimals: 6,
  },
]);

app.post("/v1/verify/incoming", async (req, reply) => {
  requireApiKey(
    req.headers.authorization as string | undefined,
    req.headers["x-otv-api-key"] as string | undefined
  );
  const claim = IncomingClaimSchema.parse(req.body);
  const adapter = createAdapter(claim.chain, claim.network, process.env.ETH_RPC_URL);
  const verdict = await verifyIncomingTransfer(claim, {
    adapter,
    keyStore,
    maxConfidence: process.env.ETH_RPC_URL ? 0.99 : 0.95,
  });
  store.saveVerdict(verdict);
  await dispatchWebhooks(mapStatusToEvent(verdict.status), verdict);
  return reply.send(verdict);
});

app.get("/v1/verdicts/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const verdict = store.verdicts.get(id);
  if (!verdict) return reply.code(404).send({ error: "not_found" });
  return verdict;
});

app.post("/v1/verdicts/verify", async (req, reply) => {
  const verdict = VerdictSchema.parse(req.body);
  if (!verdict.signature) return reply.send({ valid: false, reason: "missing_signature" });
  const pub = keyStore.getPublic(verdict.kid);
  if (!pub) return reply.send({ valid: false, reason: "unknown_kid" });
  const valid = verifyPayload(verdict, verdict.signature, pub);
  return { valid, kid: verdict.kid };
});

app.post("/v1/webhooks", async (req, reply) => {
  const key = requireApiKey(
    req.headers.authorization as string | undefined,
    req.headers["x-otv-api-key"] as string | undefined
  );
  const body = req.body as { url: string; events?: string[] };
  if (!body?.url) return reply.code(400).send({ error: "url_required" });
  const record = {
    id: `wh_${randomBytes(6).toString("hex")}`,
    projectId: key.projectId,
    url: body.url,
    secret: randomBytes(16).toString("hex"),
    events: body.events ?? ["verification.final", "verification.failed", "verification.suspicious"],
    createdAt: new Date().toISOString(),
  };
  store.webhooks.set(record.id, record);
  return { id: record.id, secret: record.secret, events: record.events };
});

app.get("/v1/usage", async (req) => {
  requireApiKey(
    req.headers.authorization as string | undefined,
    req.headers["x-otv-api-key"] as string | undefined
  );
  return store.usage;
});

app.post("/v1/organizations", async (req) => {
  const body = req.body as { name: string };
  const id = `org_${randomBytes(6).toString("hex")}`;
  const org = { id, name: body.name ?? "Untitled", createdAt: new Date().toISOString() };
  store.orgs.set(id, org);
  return org;
});

app.post("/v1/projects", async (req) => {
  const body = req.body as { orgId: string; name: string };
  const id = `proj_${randomBytes(6).toString("hex")}`;
  const project = {
    id,
    orgId: body.orgId,
    name: body.name ?? "Project",
    createdAt: new Date().toISOString(),
  };
  store.projects.set(id, project);
  return project;
});

app.post("/v1/api-keys", async (req) => {
  const body = req.body as { projectId: string; name?: string };
  return store.createApiKey(body.projectId ?? "proj_demo", body.name ?? "API Key");
});

app.post("/v1/api-keys/rotate", async (req) => {
  const body = req.body as { projectId: string; name?: string };
  return store.createApiKey(body.projectId ?? "proj_demo", body.name ?? "Rotated Key");
});

app.get("/v1/audit", async () => store.audit.slice(-100));

app.get("/v1/billing", async () => ({
  plan: "FREE",
  plans: ["FREE", "DEVELOPER", "BUSINESS", "ENTERPRISE"],
  usage: store.usage,
  provider: "abstracted",
}));

app.get("/v1/demo/meta", async () => ({
  demoApiKey: DEMO_API_KEY,
  demoTransactionHash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
  demoRecipient: "0x2222222222222222222222222222222222222222",
  demoAsset: {
    type: "erc20",
    contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    symbol: "USDC",
    decimals: 6,
  },
  expectedAmount: "1000000",
}));

const port = Number(process.env.PORT ?? defaultPorts.api);
const host = process.env.HOST ?? "0.0.0.0";

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`OTV API listening on http://${host}:${port}`);
    app.log.info(`OpenAPI UI: http://${host}:${port}/docs`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
