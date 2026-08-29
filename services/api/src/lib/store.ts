import type { Verdict } from "@otv/verdict-schema";
import { randomBytes } from "node:crypto";
import { hashSha256, hexId } from "./ids.js";
import { hashPassword, verifyPassword } from "./passwords.js";

export const DEMO_API_KEY = "otv_test_demo_key_change_me";
export const DEMO_EMAIL = "demo@poptrust.me";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "otv-demo-change-me";

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  projectId: string;
  name: string;
  prefix: string;
  hash: string;
  scopes: string[];
  createdAt: string;
  revokedAt?: string;
}

export interface WebhookRecord {
  id: string;
  projectId: string;
  url: string;
  secret: string;
  events: string[];
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  meta?: Record<string, unknown>;
}

export interface UserRecord {
  id: string;
  email: string;
  name?: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: "pending" | "retrying" | "delivered" | "failed";
  attempts: number;
  lastError?: string;
  payload: Record<string, unknown>;
  nextAttemptAt?: string;
  idempotencyKey?: string;
  responseStatus?: number;
  createdAt: string;
}

export interface UsageMeters {
  verifications: number;
  webhooks: number;
}

export interface BillingSnapshot {
  plan: string;
  plans: string[];
  usage: UsageMeters;
  provider: string;
}

export interface OtvStore {
  backend: "memory" | "postgres";
  ready(): Promise<void>;
  authenticate(apiKey?: string): Promise<ApiKeyRecord | null>;
  createApiKey(projectId: string, name: string): Promise<{ record: ApiKeyRecord; raw: string }>;
  saveVerdict(v: Verdict, projectId: string, claim?: unknown): Promise<void>;
  getVerdict(id: string): Promise<Verdict | null>;
  createOrg(name: string): Promise<Organization>;
  createProject(orgId: string, name: string): Promise<Project>;
  createWebhook(
    projectId: string,
    url: string,
    events: string[]
  ): Promise<{ record: WebhookRecord; secret: string }>;
  listWebhooks(projectId?: string): Promise<WebhookRecord[]>;
  addAudit(event: Omit<AuditEvent, "id" | "at"> & { id?: string; at?: string }): Promise<AuditEvent>;
  listAudit(limit?: number): Promise<AuditEvent[]>;
  getUsage(projectId?: string): Promise<UsageMeters>;
  incrementWebhookUsage(projectId: string): Promise<void>;
  getBilling(orgId?: string): Promise<BillingSnapshot>;
  authenticateUser(email: string, password: string): Promise<UserRecord | null>;
  createSession(userId: string, ttlMs?: number): Promise<SessionRecord>;
  getSession(token: string): Promise<(SessionRecord & { user: UserRecord }) | null>;
  destroySession(token: string): Promise<void>;
  insertDelivery(
    input: Omit<WebhookDelivery, "createdAt" | "attempts" | "status"> & {
      status?: WebhookDelivery["status"];
      attempts?: number;
    }
  ): Promise<WebhookDelivery>;
  updateDelivery(id: string, patch: Partial<WebhookDelivery>): Promise<void>;
  persistSigningKey(kid: string, publicKey: string, encryptedPrivateKey?: string, status?: string): Promise<void>;
  listVerdicts(projectId: string, limit?: number, query?: string): Promise<Verdict[]>;
  listApiKeys(projectId: string): Promise<ApiKeyRecord[]>;
  createUser(email: string, password: string, name?: string): Promise<UserRecord>;
  defaultProjectId(userId: string): Promise<string | null>;
  defaultOrgId(userId: string): Promise<string | null>;
  orgIdForProject(projectId: string): Promise<string | null>;
}

export class MemoryStore implements OtvStore {
  backend = "memory" as const;
  orgs = new Map<string, Organization>();
  projects = new Map<string, Project>();
  apiKeys = new Map<string, ApiKeyRecord>();
  verdicts = new Map<string, Verdict>();
  webhooks = new Map<string, WebhookRecord>();
  audit: AuditEvent[] = [];
  usage: UsageMeters = { verifications: 0, webhooks: 0 };
  users = new Map<string, UserRecord & { passwordHash: string }>();
  sessions = new Map<string, SessionRecord>();
  deliveries = new Map<string, WebhookDelivery>();
  signingKeys = new Map<string, { kid: string; publicKey: string }>();
  userProjects = new Map<string, string>();
  userOrgs = new Map<string, string>();
  verdictProjects = new Map<string, string>();

  constructor() {
    const orgId = "org_demo";
    const projectId = "proj_demo";
    this.orgs.set(orgId, { id: orgId, name: "OTV Demo Org", createdAt: new Date().toISOString() });
    this.projects.set(projectId, {
      id: projectId,
      orgId,
      name: "Default Project",
      createdAt: new Date().toISOString(),
    });
    this.apiKeys.set("key_demo", {
      id: "key_demo",
      projectId,
      name: "Demo key",
      prefix: "otv_test_",
      hash: hashSha256(DEMO_API_KEY),
      scopes: ["verify:write", "verdicts:read", "webhooks:write", "admin"],
      createdAt: new Date().toISOString(),
    });
    this.userProjects.set("user_demo", projectId);
    this.userOrgs.set("user_demo", orgId);
  }

  async ready(): Promise<void> {
    if (!this.users.has("user_demo")) {
      this.users.set("user_demo", {
        id: "user_demo",
        email: DEMO_EMAIL,
        name: "OTV Demo Admin",
        passwordHash: await hashPassword(DEMO_PASSWORD),
      });
    }
  }

  async authenticate(apiKey?: string): Promise<ApiKeyRecord | null> {
    if (!apiKey) return null;
    const hash = hashSha256(apiKey);
    for (const key of this.apiKeys.values()) {
      if (!key.revokedAt && key.hash === hash) return key;
    }
    return null;
  }

  async createApiKey(projectId: string, name: string): Promise<{ record: ApiKeyRecord; raw: string }> {
    const raw = `otv_live_${randomBytes(24).toString("hex")}`;
    const record: ApiKeyRecord = {
      id: hexId("key"),
      projectId,
      name,
      prefix: raw.slice(0, 12),
      hash: hashSha256(raw),
      scopes: ["verify:write", "verdicts:read", "webhooks:write"],
      createdAt: new Date().toISOString(),
    };
    this.apiKeys.set(record.id, record);
    await this.addAudit({ actor: "system", action: "api_key.created", meta: { keyId: record.id } });
    return { record, raw };
  }

  async saveVerdict(v: Verdict, projectId: string): Promise<void> {
    this.verdicts.set(v.verdictId, v);
    this.verdictProjects.set(v.verdictId, projectId);
    this.usage.verifications += 1;
  }

  async getVerdict(id: string): Promise<Verdict | null> {
    return this.verdicts.get(id) ?? null;
  }

  async createOrg(name: string): Promise<Organization> {
    const org: Organization = {
      id: hexId("org"),
      name,
      createdAt: new Date().toISOString(),
    };
    this.orgs.set(org.id, org);
    return org;
  }

  async createProject(orgId: string, name: string): Promise<Project> {
    const project: Project = {
      id: hexId("proj"),
      orgId,
      name,
      createdAt: new Date().toISOString(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  async createWebhook(
    projectId: string,
    url: string,
    events: string[]
  ): Promise<{ record: WebhookRecord; secret: string }> {
    const secret = randomBytes(16).toString("hex");
    const record: WebhookRecord = {
      id: hexId("wh"),
      projectId,
      url,
      secret,
      events,
      createdAt: new Date().toISOString(),
    };
    this.webhooks.set(record.id, record);
    return { record, secret };
  }

  async listWebhooks(projectId?: string): Promise<WebhookRecord[]> {
    const all = [...this.webhooks.values()];
    return projectId ? all.filter((w) => w.projectId === projectId) : all;
  }

  async addAudit(
    event: Omit<AuditEvent, "id" | "at"> & { id?: string; at?: string }
  ): Promise<AuditEvent> {
    const row: AuditEvent = {
      id: event.id ?? hexId("aud", 4),
      at: event.at ?? new Date().toISOString(),
      actor: event.actor,
      action: event.action,
      meta: event.meta,
    };
    this.audit.push(row);
    return row;
  }

  async listAudit(limit = 100): Promise<AuditEvent[]> {
    return this.audit.slice(-limit);
  }

  async getUsage(): Promise<UsageMeters> {
    return { ...this.usage };
  }

  async incrementWebhookUsage(): Promise<void> {
    this.usage.webhooks += 1;
  }

  async getBilling(): Promise<BillingSnapshot> {
    return {
      plan: "FREE",
      plans: ["FREE", "DEVELOPER", "BUSINESS", "ENTERPRISE"],
      usage: await this.getUsage(),
      provider: "abstracted",
    };
  }

  async authenticateUser(email: string, password: string): Promise<UserRecord | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name };
      }
    }
    return null;
  }

  async createSession(userId: string, ttlMs = 12 * 60 * 60 * 1000): Promise<SessionRecord> {
    const token = randomBytes(32).toString("hex");
    const session: SessionRecord = {
      id: hexId("sess"),
      userId,
      token,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    };
    this.sessions.set(hashSha256(token), session);
    return session;
  }

  async getSession(token: string): Promise<(SessionRecord & { user: UserRecord }) | null> {
    const session = this.sessions.get(hashSha256(token));
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(hashSha256(token));
      return null;
    }
    const user = this.users.get(session.userId);
    if (!user) return null;
    return { ...session, user: { id: user.id, email: user.email, name: user.name } };
  }

  async destroySession(token: string): Promise<void> {
    this.sessions.delete(hashSha256(token));
  }

  async insertDelivery(
    input: Omit<WebhookDelivery, "createdAt" | "attempts" | "status"> & {
      status?: WebhookDelivery["status"];
      attempts?: number;
    }
  ): Promise<WebhookDelivery> {
    const row: WebhookDelivery = {
      ...input,
      status: input.status ?? "pending",
      attempts: input.attempts ?? 0,
      createdAt: new Date().toISOString(),
    };
    this.deliveries.set(row.id, row);
    return row;
  }

  async updateDelivery(id: string, patch: Partial<WebhookDelivery>): Promise<void> {
    const current = this.deliveries.get(id);
    if (!current) return;
    this.deliveries.set(id, { ...current, ...patch });
  }

  async persistSigningKey(kid: string, publicKey: string): Promise<void> {
    this.signingKeys.set(kid, { kid, publicKey });
  }

  async listVerdicts(projectId: string, limit = 50, query?: string): Promise<Verdict[]> {
    const q = query?.trim().toLowerCase();
    const ids = [...this.verdictProjects.entries()]
      .filter(([, pid]) => pid === projectId)
      .map(([id]) => id);
    let rows = ids
      .map((id) => this.verdicts.get(id))
      .filter((v): v is Verdict => Boolean(v))
      .reverse();
    if (q) {
      rows = rows.filter(
        (v) =>
          v.verdictId.toLowerCase().includes(q) ||
          v.transactionHash.toLowerCase().includes(q) ||
          v.recipient.toLowerCase().includes(q)
      );
    }
    return rows.slice(0, limit);
  }

  async listApiKeys(projectId: string): Promise<ApiKeyRecord[]> {
    return [...this.apiKeys.values()].filter((k) => k.projectId === projectId && !k.revokedAt);
  }

  async createUser(email: string, password: string, name?: string): Promise<UserRecord> {
    const existing = [...this.users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const err = new Error("email_taken") as Error & { statusCode: number };
      err.statusCode = 409;
      throw err;
    }
    const user: UserRecord & { passwordHash: string } = {
      id: hexId("user"),
      email: email.toLowerCase(),
      name: name?.trim() || email.split("@")[0],
      passwordHash: await hashPassword(password),
    };
    this.users.set(user.id, user);
    const org = await this.createOrg(`${user.name}'s organization`);
    const project = await this.createProject(org.id, "Default Project");
    this.userOrgs.set(user.id, org.id);
    this.userProjects.set(user.id, project.id);
    return { id: user.id, email: user.email, name: user.name };
  }

  async defaultProjectId(userId: string): Promise<string | null> {
    return this.userProjects.get(userId) ?? null;
  }

  async defaultOrgId(userId: string): Promise<string | null> {
    return this.userOrgs.get(userId) ?? null;
  }

  async orgIdForProject(projectId: string): Promise<string | null> {
    return this.projects.get(projectId)?.orgId ?? null;
  }
}
