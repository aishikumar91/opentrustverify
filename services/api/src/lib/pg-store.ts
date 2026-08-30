import type { Pool } from "pg";
import type { Verdict } from "@otv/verdict-schema";
import { randomBytes } from "node:crypto";
import { hashSha256, hexId } from "./ids.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import {
  DEMO_API_KEY,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  type ApiKeyRecord,
  type AuditEvent,
  type BillingSnapshot,
  type Organization,
  type OtvStore,
  type Project,
  type SessionRecord,
  type UsageMeters,
  type UserRecord,
  type WebhookDelivery,
  type WebhookRecord,
} from "./store.js";

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export class PostgresStore implements OtvStore {
  backend = "postgres" as const;

  constructor(private readonly pool: Pool) {}

  async ready(): Promise<void> {
    await this.pool.query("SELECT 1");
    const { rows } = await this.pool.query<{ password_hash: string | null }>(
      "SELECT password_hash FROM users WHERE id = $1",
      ["user_demo"]
    );
    if (rows[0] && !rows[0].password_hash) {
      await this.pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        await hashPassword(DEMO_PASSWORD),
        "user_demo",
      ]);
    }
    const keys = await this.pool.query("SELECT id FROM api_keys WHERE id = $1", ["key_demo"]);
    if (keys.rowCount === 0) {
      await this.pool.query(
        `INSERT INTO api_keys (id, project_id, name, prefix, key_hash, scopes)
         VALUES ('key_demo', 'proj_demo', 'Demo key', 'otv_test_', $1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [hashSha256(DEMO_API_KEY), ["verify:write", "verdicts:read", "webhooks:write", "admin"]]
      );
    }
  }

  async authenticate(apiKey?: string): Promise<ApiKeyRecord | null> {
    if (!apiKey) return null;
    const hash = hashSha256(apiKey);
    const { rows } = await this.pool.query(
      `SELECT id, project_id, name, prefix, key_hash, scopes, created_at, revoked_at
       FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
      [hash]
    );
    const row = rows[0];
    if (!row) return null;
    await this.pool.query("UPDATE api_keys SET last_used_at = now() WHERE id = $1", [row.id]);
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      prefix: row.prefix,
      hash: row.key_hash,
      scopes: row.scopes ?? [],
      createdAt: iso(row.created_at),
      revokedAt: row.revoked_at ? iso(row.revoked_at) : undefined,
    };
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
    await this.pool.query(
      `INSERT INTO api_keys (id, project_id, name, prefix, key_hash, scopes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [record.id, projectId, name, record.prefix, record.hash, record.scopes, record.createdAt]
    );
    await this.addAudit({ actor: "system", action: "api_key.created", meta: { keyId: record.id } });
    return { record, raw };
  }

  async saveVerdict(v: Verdict, projectId: string, claim?: unknown): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const requestId = hexId("req");
      await client.query(
        `INSERT INTO verification_requests (id, project_id, claim) VALUES ($1, $2, $3::jsonb)`,
        [requestId, projectId, JSON.stringify(claim ?? { transactionHash: v.transactionHash })]
      );
      await client.query(
        `INSERT INTO verification_verdicts
          (id, request_id, project_id, status, confidence, verdict, checked_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          v.verdictId,
          requestId,
          projectId,
          v.status,
          v.confidence,
          JSON.stringify(v),
          v.checkedAt,
          v.expiresAt,
        ]
      );
      for (const ev of v.evidence) {
        await client.query(
          `INSERT INTO evidence_records (id, verdict_id, type, result, detail)
           VALUES ($1, $2, $3, $4, $5)`,
          [hexId("ev"), v.verdictId, ev.type, ev.result, ev.detail ?? null]
        );
      }
      for (const signal of v.risk.signals) {
        await client.query(
          `INSERT INTO risk_signals (id, verdict_id, code, severity, message)
           VALUES ($1, $2, $3, $4, $5)`,
          [hexId("rs"), v.verdictId, signal.code, signal.severity, signal.message]
        );
      }
      await client.query(
        `INSERT INTO usage_events (id, project_id, kind, quantity) VALUES ($1, $2, 'verification', 1)`,
        [hexId("use"), projectId]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getVerdict(id: string): Promise<Verdict | null> {
    const { rows } = await this.pool.query(
      "SELECT verdict FROM verification_verdicts WHERE id = $1",
      [id]
    );
    return (rows[0]?.verdict as Verdict | undefined) ?? null;
  }

  async createOrg(name: string): Promise<Organization> {
    const org: Organization = {
      id: hexId("org"),
      name,
      createdAt: new Date().toISOString(),
    };
    await this.pool.query("INSERT INTO organizations (id, name, created_at) VALUES ($1, $2, $3)", [
      org.id,
      org.name,
      org.createdAt,
    ]);
    await this.pool.query(
      `INSERT INTO billing_accounts (id, organization_id, plan) VALUES ($1, $2, 'FREE')`,
      [hexId("bill"), org.id]
    );
    return org;
  }

  async createProject(orgId: string, name: string): Promise<Project> {
    const project: Project = {
      id: hexId("proj"),
      orgId,
      name,
      createdAt: new Date().toISOString(),
    };
    await this.pool.query(
      "INSERT INTO projects (id, organization_id, name, created_at) VALUES ($1, $2, $3, $4)",
      [project.id, orgId, name, project.createdAt]
    );
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
    await this.pool.query(
      `INSERT INTO webhooks (id, project_id, url, secret_hash, hmac_secret, events, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [record.id, projectId, url, hashSha256(secret), secret, events, record.createdAt]
    );
    return { record, secret };
  }

  async listWebhooks(projectId?: string): Promise<WebhookRecord[]> {
    const { rows } = projectId
      ? await this.pool.query(
          `SELECT id, project_id, url, hmac_secret, events, created_at FROM webhooks WHERE project_id = $1`,
          [projectId]
        )
      : await this.pool.query(
          `SELECT id, project_id, url, hmac_secret, events, created_at FROM webhooks`
        );
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      url: row.url,
      secret: row.hmac_secret,
      events: row.events ?? [],
      createdAt: iso(row.created_at),
    }));
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
    await this.pool.query(
      `INSERT INTO audit_logs (id, actor, action, meta, created_at) VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [row.id, row.actor, row.action, JSON.stringify(row.meta ?? {}), row.at]
    );
    return row;
  }

  async listAudit(limit = 100): Promise<AuditEvent[]> {
    const { rows } = await this.pool.query(
      `SELECT id, created_at, actor, action, meta FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map((row) => ({
      id: row.id,
      at: iso(row.created_at),
      actor: row.actor,
      action: row.action,
      meta: row.meta ?? undefined,
    }));
  }

  async getUsage(projectId = "proj_demo"): Promise<UsageMeters> {
    const { rows } = await this.pool.query(
      `SELECT kind, COALESCE(SUM(quantity), 0)::int AS total
       FROM usage_events WHERE project_id = $1 GROUP BY kind`,
      [projectId]
    );
    const usage: UsageMeters = { verifications: 0, webhooks: 0 };
    for (const row of rows) {
      if (row.kind === "verification") usage.verifications = row.total;
      if (row.kind === "webhook") usage.webhooks = row.total;
    }
    return usage;
  }

  async incrementWebhookUsage(projectId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO usage_events (id, project_id, kind, quantity) VALUES ($1, $2, 'webhook', 1)`,
      [hexId("use"), projectId]
    );
  }

  async getBilling(orgId = "org_demo"): Promise<BillingSnapshot> {
    const { rows } = await this.pool.query(
      "SELECT plan, provider FROM billing_accounts WHERE organization_id = $1",
      [orgId]
    );
    const project = await this.pool.query(
      "SELECT id FROM projects WHERE organization_id = $1 LIMIT 1",
      [orgId]
    );
    const usage = await this.getUsage(project.rows[0]?.id ?? "proj_demo");
    return {
      plan: rows[0]?.plan ?? "FREE",
      plans: ["FREE", "DEVELOPER", "BUSINESS", "ENTERPRISE"],
      usage,
      provider: rows[0]?.provider ?? "abstracted",
    };
  }

  async authenticateUser(email: string, password: string): Promise<UserRecord | null> {
    const { rows } = await this.pool.query(
      "SELECT id, email, name, password_hash FROM users WHERE lower(email) = lower($1)",
      [email]
    );
    const row = rows[0];
    if (!row?.password_hash) return null;
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return null;
    return { id: row.id, email: row.email, name: row.name ?? undefined };
  }

  async createSession(userId: string, ttlMs = 12 * 60 * 60 * 1000): Promise<SessionRecord> {
    const token = randomBytes(32).toString("hex");
    const session: SessionRecord = {
      id: hexId("sess"),
      userId,
      token,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    };
    await this.pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [session.id, userId, hashSha256(token), session.expiresAt]
    );
    return session;
  }

  async getSession(token: string): Promise<(SessionRecord & { user: UserRecord }) | null> {
    const { rows } = await this.pool.query(
      `SELECT s.id, s.user_id, s.expires_at, u.email, u.name
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [hashSha256(token)]
    );
    const row = rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await this.pool.query("DELETE FROM sessions WHERE id = $1", [row.id]);
      return null;
    }
    return {
      id: row.id,
      userId: row.user_id,
      token,
      expiresAt: iso(row.expires_at),
      user: { id: row.user_id, email: row.email, name: row.name ?? undefined },
    };
  }

  async destroySession(token: string): Promise<void> {
    await this.pool.query("DELETE FROM sessions WHERE token_hash = $1", [hashSha256(token)]);
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
    await this.pool.query(
      `INSERT INTO webhook_deliveries
        (id, webhook_id, event, status, attempts, last_error, payload, next_attempt_at, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
      [
        row.id,
        row.webhookId,
        row.event,
        row.status,
        row.attempts,
        row.lastError ?? null,
        JSON.stringify(row.payload),
        row.nextAttemptAt ?? null,
        row.idempotencyKey ?? null,
        row.createdAt,
      ]
    );
    return row;
  }

  async updateDelivery(id: string, patch: Partial<WebhookDelivery>): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_deliveries SET
         status = COALESCE($2, status),
         attempts = COALESCE($3, attempts),
         last_error = COALESCE($4, last_error),
         next_attempt_at = COALESCE($5, next_attempt_at),
         response_status = COALESCE($6, response_status)
       WHERE id = $1`,
      [
        id,
        patch.status ?? null,
        patch.attempts ?? null,
        patch.lastError ?? null,
        patch.nextAttemptAt ?? null,
        patch.responseStatus ?? null,
      ]
    );
  }

  async persistSigningKey(
    kid: string,
    publicKey: string,
    encryptedPrivateKey?: string,
    status = "active"
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO signing_keys (kid, public_key, encrypted_private_key, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (kid) DO UPDATE SET
         public_key = EXCLUDED.public_key,
         encrypted_private_key = COALESCE(EXCLUDED.encrypted_private_key, signing_keys.encrypted_private_key),
         status = EXCLUDED.status`,
      [kid, publicKey, encryptedPrivateKey ?? null, status]
    );
  }

  async listVerdicts(projectId: string, limit = 50, query?: string): Promise<Verdict[]> {
    const q = query?.trim();
    const { rows } = q
      ? await this.pool.query(
          `SELECT verdict FROM verification_verdicts
           WHERE project_id = $1
             AND (
               id ILIKE $3
               OR verdict->>'transactionHash' ILIKE $3
               OR verdict->>'recipient' ILIKE $3
             )
           ORDER BY checked_at DESC LIMIT $2`,
          [projectId, limit, `%${q}%`]
        )
      : await this.pool.query(
          `SELECT verdict FROM verification_verdicts
           WHERE project_id = $1
           ORDER BY checked_at DESC LIMIT $2`,
          [projectId, limit]
        );
    return rows.map((row) => row.verdict as Verdict);
  }

  async listApiKeys(projectId: string): Promise<ApiKeyRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT id, project_id, name, prefix, key_hash, scopes, created_at, revoked_at
       FROM api_keys WHERE project_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [projectId]
    );
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      prefix: row.prefix,
      hash: row.key_hash,
      scopes: row.scopes ?? [],
      createdAt: iso(row.created_at),
      revokedAt: row.revoked_at ? iso(row.revoked_at) : undefined,
    }));
  }

  async createUser(email: string, password: string, name?: string): Promise<UserRecord> {
    const normalized = email.trim().toLowerCase();
    const display = name?.trim() || normalized.split("@")[0];
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO roles (id, name) VALUES ('role_owner', 'owner') ON CONFLICT (id) DO NOTHING`
      );
      const userId = hexId("user");
      try {
        await client.query(
          `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`,
          [userId, normalized, display, await hashPassword(password)]
        );
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "23505") {
          const taken = new Error("email_taken") as Error & { statusCode: number };
          taken.statusCode = 409;
          throw taken;
        }
        throw err;
      }
      const orgId = hexId("org");
      const projectId = hexId("proj");
      await client.query(`INSERT INTO organizations (id, name) VALUES ($1, $2)`, [
        orgId,
        `${display}'s organization`,
      ]);
      await client.query(
        `INSERT INTO billing_accounts (id, organization_id, plan) VALUES ($1, $2, 'FREE')`,
        [hexId("bill"), orgId]
      );
      await client.query(
        `INSERT INTO projects (id, organization_id, name) VALUES ($1, $2, $3)`,
        [projectId, orgId, "Default Project"]
      );
      await client.query(
        `INSERT INTO memberships (id, organization_id, user_id, role_id) VALUES ($1, $2, $3, 'role_owner')`,
        [hexId("mem"), orgId, userId]
      );
      await client.query("COMMIT");
      return { id: userId, email: normalized, name: display };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const { rows } = await this.pool.query(
      "SELECT id, email, name FROM users WHERE lower(email) = lower($1)",
      [email]
    );
    const row = rows[0];
    return row ? { id: row.id, email: row.email, name: row.name ?? undefined } : null;
  }

  async findOrCreateOidcUser(email: string, name?: string): Promise<UserRecord> {
    const existing = await this.findUserByEmail(email);
    if (existing) return existing;
    const normalized = email.trim().toLowerCase();
    const display = name?.trim() || normalized.split("@")[0];
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO roles (id, name) VALUES ('role_owner', 'owner') ON CONFLICT (id) DO NOTHING`
      );
      const userId = hexId("user");
      await client.query(
        `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, NULL)`,
        [userId, normalized, display]
      );
      const orgId = hexId("org");
      const projectId = hexId("proj");
      await client.query(`INSERT INTO organizations (id, name) VALUES ($1, $2)`, [
        orgId,
        `${display}'s organization`,
      ]);
      await client.query(
        `INSERT INTO billing_accounts (id, organization_id, plan) VALUES ($1, $2, 'FREE')`,
        [hexId("bill"), orgId]
      );
      await client.query(
        `INSERT INTO projects (id, organization_id, name) VALUES ($1, $2, $3)`,
        [projectId, orgId, "Default Project"]
      );
      await client.query(
        `INSERT INTO memberships (id, organization_id, user_id, role_id) VALUES ($1, $2, $3, 'role_owner')`,
        [hexId("mem"), orgId, userId]
      );
      await client.query("COMMIT");
      return { id: userId, email: normalized, name: display };
    } catch (err) {
      await client.query("ROLLBACK");
      const code = (err as { code?: string }).code;
      if (code === "23505") {
        const again = await this.findUserByEmail(email);
        if (again) return again;
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async defaultProjectId(userId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT p.id FROM projects p
       JOIN memberships m ON m.organization_id = p.organization_id
       WHERE m.user_id = $1
       ORDER BY p.created_at ASC
       LIMIT 1`,
      [userId]
    );
    return rows[0]?.id ?? null;
  }

  async defaultOrgId(userId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT organization_id FROM memberships WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return rows[0]?.organization_id ?? null;
  }

  async orgIdForProject(projectId: string): Promise<string | null> {
    const { rows } = await this.pool.query(
      "SELECT organization_id FROM projects WHERE id = $1",
      [projectId]
    );
    return rows[0]?.organization_id ?? null;
  }
}
