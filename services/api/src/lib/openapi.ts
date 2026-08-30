import type { FastifySchema } from "fastify";

const errorBody = {
  type: "object",
  additionalProperties: true,
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    details: { type: "object", additionalProperties: true },
  },
} as const;

const authHeaders = {
  type: "object",
  properties: {
    authorization: {
      type: "string",
      description: "Bearer API key, e.g. Bearer otv_test_demo_key_change_me",
      examples: ["Bearer otv_test_demo_key_change_me"],
    },
    "x-otv-api-key": {
      type: "string",
      description: "Raw API key (alternative to Authorization)",
      examples: ["otv_test_demo_key_change_me"],
    },
    "x-otv-session": {
      type: "string",
      description: "Session token from login/register (alternative to otv_session cookie)",
    },
  },
} as const;

const secured: Array<Record<string, string[]>> = [{ ApiKey: [] }, { Bearer: [] }, { Session: [] }];

const asset = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["native", "erc20", "erc721", "erc1155", "other"] },
    contract: { type: "string", examples: ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"] },
    symbol: { type: "string", examples: ["USDC"] },
    decimals: { type: "integer", minimum: 0, maximum: 36, examples: [6] },
    tokenId: { type: "string" },
  },
} as const;

const incomingClaim = {
  type: "object",
  required: ["chain", "network", "transactionHash", "recipient"],
  additionalProperties: false,
  properties: {
    chain: { type: "string", examples: ["ethereum"] },
    network: { type: "string", examples: ["sepolia"] },
    transactionHash: {
      type: "string",
      examples: ["0xdemo000000000000000000000000000000000000000000000000000000000001"],
    },
    recipient: {
      type: "string",
      examples: ["0x2222222222222222222222222222222222222222"],
    },
    asset,
    expectedAmount: { type: "string", examples: ["1000000"] },
  },
} as const;

const verdict = {
  type: "object",
  additionalProperties: true,
  properties: {
    schema: { type: "string", examples: ["otv.verdict.v1"] },
    verdictId: { type: "string" },
    status: {
      type: "string",
      enum: [
        "OBSERVED",
        "PENDING",
        "EXECUTED",
        "ASSET_CONFIRMED",
        "BALANCE_CONFIRMED",
        "FINAL",
        "SPENDABLE",
        "REJECTED",
        "SUSPICIOUS",
        "UNVERIFIED",
      ],
    },
    confidence: { type: "number" },
    chain: { type: "string" },
    network: { type: "string" },
    transactionHash: { type: "string" },
    recipient: { type: "string" },
    asset,
    amount: { type: "string" },
    balanceDelta: { type: "string" },
    finality: { type: "object", additionalProperties: true },
    risk: { type: "object", additionalProperties: true },
    evidence: { type: "array", items: { type: "object", additionalProperties: true } },
    policyVersion: { type: "string" },
    checkedAt: { type: "string" },
    expiresAt: { type: "string" },
    verifier: { type: "string" },
    kid: { type: "string" },
    signature: { type: "string" },
  },
} as const;

const user = {
  type: "object",
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    name: { type: "string" },
  },
} as const;

function ok(schema: Record<string, unknown>) {
  return {
    200: schema,
    400: errorBody,
    401: errorBody,
    404: errorBody,
    429: errorBody,
    501: errorBody,
    503: errorBody,
  };
}

export const openapiInfo = {
  tags: [
    { name: "ops", description: "Health, readiness, metrics, OpenAPI" },
    { name: "catalog", description: "Public chain, network, asset, and key catalogs" },
    { name: "auth", description: "Register, login, session, OIDC/SSO" },
    { name: "verify", description: "Submit an incoming-transfer claim" },
    { name: "verdicts", description: "Lookup and signature check" },
    { name: "admin", description: "Orgs, projects, keys, usage, billing, audit" },
    { name: "webhooks", description: "HMAC webhook endpoints" },
  ],
  components: {
    securitySchemes: {
      ApiKey: {
        type: "apiKey",
        in: "header",
        name: "X-OTV-Api-Key",
        description: "Project API key",
      },
      Bearer: {
        type: "http",
        scheme: "bearer",
        description: "Same API key as Bearer token",
      },
      Session: {
        type: "apiKey",
        in: "header",
        name: "X-OTV-Session",
        description: "sessionToken from POST /v1/auth/login",
      },
    },
  },
} as const;

export const routes: Record<string, FastifySchema> = {
  health: {
    tags: ["ops"],
    summary: "Liveness",
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        status: { type: "string" },
        product: { type: "string" },
        shortName: { type: "string" },
        tagline: { type: "string" },
        domain: { type: "string" },
        store: { type: "string" },
        redis: { type: "boolean" },
        time: { type: "string" },
      },
    }),
  },
  ready: {
    tags: ["ops"],
    summary: "Readiness (Postgres, Redis, signing key)",
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        status: { type: "string" },
        store: { type: "string" },
        redis: { type: "boolean" },
        error: { type: "string" },
      },
    }),
  },
  metrics: {
    tags: ["ops"],
    summary: "Prometheus text exposition",
    produces: ["text/plain"],
    response: { 200: { type: "string" } },
  },
  openapiJson: {
    tags: ["ops"],
    summary: "OpenAPI document",
    response: { 200: { type: "object", additionalProperties: true } },
  },
  keys: {
    tags: ["catalog"],
    summary: "Public signing keys (JWKS-style list)",
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        keys: { type: "array", items: { type: "object", additionalProperties: true } },
      },
    }),
  },
  chains: {
    tags: ["catalog"],
    summary: "Supported chains",
    response: { 200: { type: "array", items: { type: "object", additionalProperties: true } } },
  },
  networks: {
    tags: ["catalog"],
    summary: "Supported networks",
    querystring: {
      type: "object",
      properties: { chain: { type: "string", examples: ["ethereum"] } },
    },
    response: { 200: { type: "array", items: { type: "object", additionalProperties: true } } },
  },
  assets: {
    tags: ["catalog"],
    summary: "Known assets. Any contract still verifies on a supported chain.",
    querystring: {
      type: "object",
      properties: {
        chain: { type: "string", examples: ["ethereum"] },
        network: { type: "string", examples: ["mainnet"] },
      },
    },
    response: { 200: { type: "array", items: { type: "object", additionalProperties: true } } },
  },
  verifyIncoming: {
    tags: ["verify"],
    summary: "Verify an incoming transfer",
    description: "Session or API key required. Returns a signed otv.verdict.v1.",
    security: secured,
    headers: authHeaders,
    body: incomingClaim,
    response: ok(verdict),
  },
  listVerdicts: {
    tags: ["verdicts"],
    summary: "List verdicts for the authenticated project",
    security: secured,
    headers: authHeaders,
    querystring: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "Filter by verdict id, transaction hash, or recipient",
        },
      },
    },
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: { verdicts: { type: "array", items: verdict } },
    }),
  },
  getVerdict: {
    tags: ["verdicts"],
    summary: "Fetch a stored verdict by id (public)",
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Verdict id (vr_…)", examples: ["vr_demo"] },
      },
    },
    response: ok(verdict),
  },
  register: {
    tags: ["auth"],
    summary: "Create account, org, project, and session",
    body: {
      type: "object",
      required: ["email", "password"],
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email", examples: ["builder@poptrust.me"] },
        password: { type: "string", minLength: 8, examples: ["securepass1"] },
        name: { type: "string", examples: ["Builder"] },
      },
    },
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        user,
        expiresAt: { type: "string" },
        sessionToken: { type: "string" },
      },
    }),
  },
  login: {
    tags: ["auth"],
    summary: "Email/password login",
    body: {
      type: "object",
      required: ["email", "password"],
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email", examples: ["demo@poptrust.me"] },
        password: { type: "string", examples: ["otv-demo-change-me"] },
      },
    },
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        user,
        expiresAt: { type: "string" },
        sessionToken: { type: "string" },
      },
    }),
  },
  logout: {
    tags: ["auth"],
    summary: "Destroy session",
    headers: authHeaders,
    response: ok({ type: "object", properties: { ok: { type: "boolean" } } }),
  },
  me: {
    tags: ["auth"],
    summary: "Current session user",
    security: [{ Session: [] }],
    headers: authHeaders,
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        user,
        projectId: { type: "string" },
        orgId: { type: "string" },
        sessionToken: { type: "string" },
      },
    }),
  },
  oidcStatus: {
    tags: ["auth"],
    summary: "Whether SSO is configured",
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        enabled: { type: "boolean" },
        issuer: { type: "string" },
      },
    }),
  },
  oidc: {
    tags: ["auth"],
    summary: "Start OIDC login (redirects when configured)",
    querystring: {
      type: "object",
      properties: { return_to: { type: "string", examples: ["/dashboard"] } },
    },
    response: {
      302: { description: "Redirect to identity provider" },
      501: errorBody,
      502: errorBody,
    },
  },
  oidcCallback: {
    tags: ["auth"],
    summary: "OIDC authorization-code callback",
    querystring: {
      type: "object",
      properties: {
        code: { type: "string" },
        state: { type: "string" },
        error: { type: "string" },
      },
    },
    response: {
      302: { description: "Redirect to app session" },
      501: errorBody,
    },
  },
  createOrg: {
    tags: ["admin"],
    summary: "Create organization",
    security: secured,
    headers: authHeaders,
    body: {
      type: "object",
      properties: { name: { type: "string", examples: ["Acme"] } },
    },
    response: ok({ type: "object", additionalProperties: true }),
  },
  createProject: {
    tags: ["admin"],
    summary: "Create project",
    security: secured,
    headers: authHeaders,
    body: {
      type: "object",
      required: ["orgId"],
      properties: {
        orgId: { type: "string" },
        name: { type: "string", examples: ["Production"] },
      },
    },
    response: ok({ type: "object", additionalProperties: true }),
  },
  listApiKeys: {
    tags: ["admin"],
    summary: "List API keys (secrets not returned)",
    security: secured,
    headers: authHeaders,
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: { keys: { type: "array", items: { type: "object", additionalProperties: true } } },
    }),
  },
  createApiKey: {
    tags: ["admin"],
    summary: "Create API key (raw secret once)",
    security: secured,
    headers: authHeaders,
    body: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Defaults to the session or key project" },
        name: { type: "string", examples: ["Production key"] },
      },
    },
    response: ok({ type: "object", additionalProperties: true }),
  },
  rotateApiKey: {
    tags: ["admin"],
    summary: "Issue a replacement API key",
    security: secured,
    headers: authHeaders,
    body: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string", examples: ["Rotated Key"] },
      },
    },
    response: ok({ type: "object", additionalProperties: true }),
  },
  audit: {
    tags: ["admin"],
    summary: "Recent audit events",
    security: secured,
    headers: authHeaders,
    response: {
      200: { type: "array", items: { type: "object", additionalProperties: true } },
      401: errorBody,
    },
  },
  billing: {
    tags: ["admin"],
    summary: "Plan and usage meters",
    security: secured,
    headers: authHeaders,
    response: ok({ type: "object", additionalProperties: true }),
  },
  verifySignature: {
    tags: ["verdicts"],
    summary: "Check an Ed25519 verdict signature (public)",
    body: verdict,
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        valid: { type: "boolean" },
        kid: { type: "string" },
        reason: { type: "string" },
      },
    }),
  },
  createWebhook: {
    tags: ["webhooks"],
    summary: "Register an HTTPS webhook",
    security: secured,
    headers: authHeaders,
    body: {
      type: "object",
      required: ["url"],
      additionalProperties: false,
      properties: {
        url: { type: "string", format: "uri", examples: ["https://example.com/otv/webhook"] },
        events: {
          type: "array",
          items: { type: "string" },
          examples: [["verification.final", "verification.failed", "verification.suspicious"]],
        },
      },
    },
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        id: { type: "string" },
        secret: { type: "string" },
        events: { type: "array", items: { type: "string" } },
      },
    }),
  },
  listWebhooks: {
    tags: ["webhooks"],
    summary: "List webhooks (secrets omitted)",
    security: secured,
    headers: authHeaders,
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: { webhooks: { type: "array", items: { type: "object", additionalProperties: true } } },
    }),
  },
  usage: {
    tags: ["admin"],
    summary: "Project usage counters",
    security: secured,
    headers: authHeaders,
    response: ok({
      type: "object",
      additionalProperties: true,
      properties: {
        verifications: { type: "integer" },
        webhooks: { type: "integer" },
      },
    }),
  },
  demoMeta: {
    tags: ["catalog"],
    summary: "Demo claim values for local/try-it-out",
    response: ok({ type: "object", additionalProperties: true }),
  },
};
