import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { Redis } from "ioredis";
import { product, defaultPorts } from "@otv/config";
import { IncomingClaimSchema, VerdictSchema } from "@otv/verdict-schema";
import {
  BITCOIN_DEMO,
  SOLANA_DEMO,
  TRON_DEMO,
  catalogAssets,
  catalogChains,
  catalogNetworks,
  createAdapter,
} from "@otv/chain-adapters";
import {
  authorizeUrl,
  createOidcCookie,
  exchangeCode,
  fetchDiscovery,
  oidcConfigured,
  oidcCookieName,
  oidcIssuer,
  parseOidcCookie,
} from "./lib/oidc.js";
import { verifyIncomingTransfer } from "@otv/verification-engine";
import { verifyPayload, type SigningKeyStore } from "@otv/crypto-signatures";
import { ZodError } from "zod";
import { DEMO_API_KEY, DEMO_EMAIL, type ApiKeyRecord, type OtvStore, type UserRecord } from "./lib/store.js";
import { dispatchWebhooks, mapStatusToEvent, isSafeWebhookUrl, processWebhookJob } from "./lib/webhooks.js";
import {
  apiErrors,
  registry,
  storeBackend,
  verificationDuration,
  verificationTotal,
} from "./lib/metrics.js";
import { popWebhookJob } from "./lib/queue.js";
import { openapiInfo, routes as openapi } from "./lib/openapi.js";

export interface AppDeps {
  store: OtvStore;
  keyStore: SigningKeyStore;
  redis?: Redis;
  embedWorker?: boolean;
}

type AuthContext = {
  apiKey?: ApiKeyRecord;
  user?: UserRecord;
};

function httpError(message: string, statusCode: number): Error {
  const err = new Error(message);
  (err as Error & { statusCode: number }).statusCode = statusCode;
  return err;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
  }
  return "otv-dev-session-secret-change-me-32";
}

function sessionTokenFrom(req: FastifyRequest): string | undefined {
  const header = req.headers["x-otv-session"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const cookieToken = req.cookies?.otv_session;
  return cookieToken || undefined;
}

function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "1") return true;
  if (process.env.COOKIE_SECURE === "0") return false;
  return process.env.NODE_ENV === "production";
}

function cookieSameSite(): "lax" | "none" | "strict" {
  const raw = (process.env.COOKIE_SAMESITE ?? "").toLowerCase();
  if (raw === "none" || raw === "lax" || raw === "strict") return raw;
  return cookieSecure() ? "none" : "lax";
}

async function readSession(req: FastifyRequest, store: OtvStore): Promise<UserRecord | undefined> {
  const token = sessionTokenFrom(req);
  if (!token) return undefined;
  const session = await store.getSession(token);
  return session?.user;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { store, keyStore, redis, embedWorker } = deps;
  storeBackend.set({ backend: store.backend }, 1);
  const app = Fastify({ logger: true, trustProxy: true });

  await app.register(cookie, { secret: sessionSecret() });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(
    rateLimit,
    redis
      ? { max: 120, timeWindow: "1 minute", redis: redis as never }
      : { max: 120, timeWindow: "1 minute" }
  );
  const publicBase = process.env.OTV_PUBLIC_URL ?? `http://localhost:${defaultPorts.api}`;
  await app.register(swagger, {
    openapi: {
      info: {
        title: "OpenTrust Verify API",
        description: `${product.tagline} Send a claim, get a signed verdict. Authenticate with an API key (Authorization Bearer or X-OTV-Api-Key) or a session (X-OTV-Session or the otv_session cookie).`,
        version: "0.1.0",
      },
      servers: [{ url: publicBase, description: "This deployment" }],
      tags: [...openapiInfo.tags],
      components: {
        securitySchemes: openapiInfo.components.securitySchemes,
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      url: "/v1/openapi.json",
    },
  });

  async function requireApiKey(req: FastifyRequest): Promise<ApiKeyRecord> {
    const headerAuth = req.headers.authorization;
    const headerKey = req.headers["x-otv-api-key"];
    const raw = (typeof headerKey === "string" ? headerKey : undefined) || headerAuth?.replace(/^Bearer\s+/i, "");
    const key = await store.authenticate(raw);
    if (!key) throw httpError("Unauthorized", 401);
    return key;
  }

  async function requireUserOrKey(req: FastifyRequest): Promise<AuthContext> {
    const user = await readSession(req, store);
    if (user) return { user };
    const key = await requireApiKey(req).catch(() => null);
    if (key) return { apiKey: key };
    throw httpError("Unauthorized", 401);
  }

  async function resolveProject(req: FastifyRequest): Promise<{
    projectId: string;
    orgId: string | null;
    actor: string;
    user?: UserRecord;
    apiKey?: ApiKeyRecord;
  }> {
    const user = await readSession(req, store);
    if (user) {
      const projectId = await store.defaultProjectId(user.id);
      if (!projectId) throw httpError("no_project", 400);
      const orgId = await store.defaultOrgId(user.id);
      return { projectId, orgId, actor: user.email, user };
    }
    const key = await requireApiKey(req);
    const orgId = await store.orgIdForProject(key.projectId);
    return { projectId: key.projectId, orgId, actor: key.id, apiKey: key };
  }

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation_error", details: err.flatten() });
    }
    const status = (err as Error & { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) apiErrors.inc({ route: req.routeOptions?.url ?? req.url });
    const message = err instanceof Error ? err.message : "internal_error";
    if (status >= 500) app.log.error({ err }, message);
    return reply.code(status).send({ error: status === 401 ? "unauthorized" : message });
  });

  app.get("/v1/health", { schema: openapi.health }, async () => ({
    status: "ok",
    product: product.name,
    shortName: product.shortName,
    tagline: product.tagline,
    domain: product.domain,
    store: store.backend,
    redis: Boolean(redis),
    time: new Date().toISOString(),
  }));

  app.get("/v1/ready", { schema: openapi.ready }, async (_req, reply) => {
    try {
      await store.ready();
      if (redis) await redis.ping();
      keyStore.getActive();
      return { status: "ready", store: store.backend, redis: Boolean(redis) };
    } catch (err) {
      return reply.code(503).send({
        status: "not_ready",
        error: err instanceof Error ? err.message : "not_ready",
      });
    }
  });

  app.get("/v1/metrics", { schema: openapi.metrics }, async (_req, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  app.get("/v1/openapi.json", { schema: openapi.openapiJson }, async () => app.swagger());

  app.get("/v1/keys", { schema: openapi.keys }, async () => ({ keys: keyStore.listPublic() }));

  app.get("/v1/chains", { schema: openapi.chains }, async () => catalogChains());

  app.get("/v1/networks", { schema: openapi.networks }, async (req) => {
    const chain = typeof (req.query as { chain?: string }).chain === "string"
      ? (req.query as { chain: string }).chain
      : undefined;
    return catalogNetworks(chain);
  });

  app.get("/v1/assets", { schema: openapi.assets }, async (req) => {
    const q = req.query as { chain?: string; network?: string };
    return catalogAssets(
      typeof q.chain === "string" ? q.chain : undefined,
      typeof q.network === "string" ? q.network : undefined
    );
  });

  app.post("/v1/verify/incoming", { schema: openapi.verifyIncoming }, async (req, reply) => {
    const auth = await resolveProject(req);
    const claim = IncomingClaimSchema.parse(req.body);
    const adapter = createAdapter(claim.chain, claim.network);
    const live = adapter.isLive === true;
    const stopTimer = verificationDuration.startTimer();
    const verdict = await verifyIncomingTransfer(claim, {
      adapter,
      keyStore,
      maxConfidence: live ? 0.99 : 0.95,
    });
    stopTimer();
    if (!live) {
      verdict.risk.signals = [
        ...verdict.risk.signals,
        {
          code: "MOCK_ADAPTER",
          severity: "LOW",
          message: "Verdict produced via mock chain adapter; not live chain evidence",
        },
      ];
      if (verdict.risk.level === "LOW") verdict.risk.level = "MEDIUM";
    }
    await store.saveVerdict(verdict, auth.projectId, claim);
    verificationTotal.inc({ status: verdict.status, adapter: live ? adapter.chainId : "mock" });
    await dispatchWebhooks(store, redis, mapStatusToEvent(verdict.status), verdict);
    return reply.send(verdict);
  });

  app.get("/v1/verdicts", { schema: openapi.listVerdicts }, async (req) => {
    const auth = await resolveProject(req);
    const query = typeof (req.query as { q?: string }).q === "string" ? (req.query as { q: string }).q : undefined;
    const verdicts = await store.listVerdicts(auth.projectId, 100, query);
    return { verdicts };
  });

  app.get("/v1/verdicts/:id", { schema: openapi.getVerdict }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const verdict = await store.getVerdict(id);
    if (!verdict) return reply.code(404).send({ error: "not_found" });
    return verdict;
  });

  app.post("/v1/auth/register", { schema: openapi.register }, async (req, reply) => {
    const body = req.body as { email?: string; password?: string; name?: string };
    if (!body?.email || !body.password) return reply.code(400).send({ error: "email_password_required" });
    if (body.password.length < 8) return reply.code(400).send({ error: "password_too_short" });
    const user = await store.createUser(body.email, body.password, body.name);
    const session = await store.createSession(user.id);
    reply.setCookie("otv_session", session.token, {
      path: "/",
      httpOnly: true,
      sameSite: cookieSameSite(),
      secure: cookieSecure(),
      maxAge: 12 * 60 * 60,
    });
    await store.addAudit({ actor: user.email, action: "auth.register" });
    return { user, expiresAt: session.expiresAt, sessionToken: session.token };
  });

  app.post("/v1/auth/login", { schema: openapi.login }, async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    if (!body?.email || !body.password) return reply.code(400).send({ error: "email_password_required" });
    const user = await store.authenticateUser(body.email, body.password);
    if (!user) return reply.code(401).send({ error: "invalid_credentials" });
    const session = await store.createSession(user.id);
    reply.setCookie("otv_session", session.token, {
      path: "/",
      httpOnly: true,
      sameSite: cookieSameSite(),
      secure: cookieSecure(),
      maxAge: 12 * 60 * 60,
    });
    await store.addAudit({ actor: user.email, action: "auth.login" });
    return { user, expiresAt: session.expiresAt, sessionToken: session.token };
  });

  app.post("/v1/auth/logout", { schema: openapi.logout }, async (req, reply) => {
    const token = sessionTokenFrom(req);
    if (token) await store.destroySession(token);
    reply.clearCookie("otv_session", { path: "/" });
    return { ok: true };
  });

  app.get("/v1/auth/me", { schema: openapi.me }, async (req, reply) => {
    const user = await readSession(req, store);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    const projectId = await store.defaultProjectId(user.id);
    const orgId = await store.defaultOrgId(user.id);
    return { user, projectId, orgId };
  });

  app.get("/v1/auth/oidc/status", { schema: openapi.oidcStatus }, async () => ({
    enabled: oidcConfigured(),
    issuer: oidcConfigured() ? oidcIssuer() : undefined,
  }));

  app.get("/v1/auth/oidc/login", { schema: openapi.oidc }, async (req, reply) => {
    if (!oidcConfigured()) {
      return reply.code(501).send({
        error: "oidc_not_configured",
        message: "Set OIDC_ISSUER and OIDC_CLIENT_ID to enable SSO. See docs/security/OIDC.md",
      });
    }
    try {
      const returnTo = typeof (req.query as { return_to?: string }).return_to === "string"
        ? (req.query as { return_to: string }).return_to
        : "/dashboard";
      const cookie = createOidcCookie(returnTo);
      const discovery = await fetchDiscovery();
      reply.setCookie(oidcCookieName(), cookie.value, {
        path: "/",
        httpOnly: true,
        sameSite: cookieSameSite(),
        secure: cookieSecure(),
        maxAge: 10 * 60,
      });
      return reply.redirect(authorizeUrl(discovery, cookie.state, cookie.verifier));
    } catch (err) {
      return reply.code(502).send({
        error: "oidc_discovery_failed",
        message: err instanceof Error ? err.message : "OIDC discovery failed",
      });
    }
  });

  app.get("/v1/auth/oidc/callback", { schema: openapi.oidcCallback }, async (req, reply) => {
    if (!oidcConfigured()) {
      return reply.code(501).send({ error: "oidc_not_configured" });
    }
    const q = req.query as { code?: string; state?: string; error?: string };
    const publicUrl = (process.env.OTV_PUBLIC_URL ?? "").replace(/\/$/, "");
    const fail = `${publicUrl || ""}/login?sso=error`;
    if (q.error || !q.code || !q.state) return reply.redirect(fail);
    const parsed = parseOidcCookie(req.cookies?.[oidcCookieName()]);
    if (!parsed || parsed.state !== q.state) return reply.redirect(fail);
    try {
      const discovery = await fetchDiscovery();
      const identity = await exchangeCode(discovery, q.code, parsed.verifier);
      const user = await store.findOrCreateOidcUser(identity.email, identity.name);
      const session = await store.createSession(user.id);
      reply.clearCookie(oidcCookieName(), { path: "/" });
      reply.setCookie("otv_session", session.token, {
        path: "/",
        httpOnly: true,
        sameSite: cookieSameSite(),
        secure: cookieSecure(),
        maxAge: 12 * 60 * 60,
      });
      await store.addAudit({ actor: user.email, action: "auth.oidc" });
      const dest = `${publicUrl}${parsed.returnTo}`;
      return reply.redirect(dest || parsed.returnTo);
    } catch {
      return reply.redirect(fail);
    }
  });

  app.post("/v1/organizations", { schema: openapi.createOrg }, async (req) => {
    await requireUserOrKey(req);
    const body = req.body as { name: string };
    return store.createOrg(body.name ?? "Untitled");
  });

  app.post("/v1/projects", { schema: openapi.createProject }, async (req) => {
    await requireUserOrKey(req);
    const body = req.body as { orgId: string; name: string };
    return store.createProject(body.orgId, body.name ?? "Project");
  });

  app.get("/v1/api-keys", { schema: openapi.listApiKeys }, async (req) => {
    const auth = await resolveProject(req);
    const keys = await store.listApiKeys(auth.projectId);
    return {
      keys: keys.map((k) => ({
        id: k.id,
        projectId: k.projectId,
        name: k.name,
        prefix: k.prefix,
        scopes: k.scopes,
        createdAt: k.createdAt,
      })),
    };
  });

  app.post("/v1/api-keys", { schema: openapi.createApiKey }, async (req) => {
    const auth = await resolveProject(req);
    const body = req.body as { projectId?: string; name?: string };
    return store.createApiKey(body.projectId ?? auth.projectId, body.name ?? "API Key");
  });

  app.post("/v1/api-keys/rotate", { schema: openapi.rotateApiKey }, async (req) => {
    const auth = await resolveProject(req);
    const body = req.body as { projectId?: string; name?: string };
    return store.createApiKey(body.projectId ?? auth.projectId, body.name ?? "Rotated Key");
  });

  app.get("/v1/audit", { schema: openapi.audit }, async (req) => {
    await requireUserOrKey(req);
    return store.listAudit(100);
  });

  app.get("/v1/billing", { schema: openapi.billing }, async (req) => {
    const auth = await resolveProject(req);
    return store.getBilling(auth.orgId ?? undefined);
  });

  app.post("/v1/verdicts/verify", { schema: openapi.verifySignature }, async (req, reply) => {
    const verdict = VerdictSchema.parse(req.body);
    if (!verdict.signature) return reply.send({ valid: false, reason: "missing_signature" });
    const pub = keyStore.getPublic(verdict.kid);
    if (!pub) return reply.send({ valid: false, reason: "unknown_kid" });
    const valid = verifyPayload(verdict, verdict.signature, pub);
    return { valid, kid: verdict.kid };
  });

  app.post("/v1/webhooks", { schema: openapi.createWebhook }, async (req, reply) => {
    const auth = await resolveProject(req);
    const body = req.body as { url: string; events?: string[] };
    if (!body?.url) return reply.code(400).send({ error: "url_required" });
    if (!isSafeWebhookUrl(body.url)) {
      return reply.code(400).send({ error: "unsafe_webhook_url" });
    }
    const created = await store.createWebhook(
      auth.projectId,
      body.url,
      body.events ?? ["verification.final", "verification.failed", "verification.suspicious"]
    );
    return { id: created.record.id, secret: created.secret, events: created.record.events };
  });

  app.get("/v1/webhooks", { schema: openapi.listWebhooks }, async (req) => {
    const auth = await resolveProject(req);
    const webhooks = await store.listWebhooks(auth.projectId);
    return {
      webhooks: webhooks.map((w) => ({
        id: w.id,
        projectId: w.projectId,
        url: w.url,
        events: w.events,
        createdAt: w.createdAt,
      })),
    };
  });

  app.get("/v1/usage", { schema: openapi.usage }, async (req) => {
    const auth = await resolveProject(req);
    return store.getUsage(auth.projectId);
  });

  app.get("/v1/demo/meta", { schema: openapi.demoMeta }, async () => ({
    demoApiKey: DEMO_API_KEY,
    demoEmail: DEMO_EMAIL,
    demoTransactionHash: "0xdemo000000000000000000000000000000000000000000000000000000000001",
    demoRecipient: "0x2222222222222222222222222222222222222222",
    demoAsset: {
      type: "erc20",
      contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      symbol: "USDC",
      decimals: 6,
    },
    expectedAmount: "1000000",
    bitcoin: BITCOIN_DEMO,
    solana: SOLANA_DEMO,
    tron: TRON_DEMO,
  }));

  if (embedWorker && redis) {
    let running = true;
    app.addHook("onClose", async () => {
      running = false;
    });
    void (async () => {
      while (running) {
        try {
          const job = await popWebhookJob(redis, 2);
          if (job) await processWebhookJob(store, redis, job);
        } catch (err) {
          app.log.error({ err }, "embedded webhook worker error");
        }
      }
    })();
  }

  return app;
}

export { DEMO_API_KEY };
