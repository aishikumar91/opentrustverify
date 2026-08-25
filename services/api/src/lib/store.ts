import type { Verdict } from "@otv/verdict-schema";
import { createHash, randomBytes } from "node:crypto";

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

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export class MemoryStore {
  orgs = new Map<string, Organization>();
  projects = new Map<string, Project>();
  apiKeys = new Map<string, ApiKeyRecord>();
  verdicts = new Map<string, Verdict>();
  webhooks = new Map<string, WebhookRecord>();
  audit: AuditEvent[] = [];
  usage = { verifications: 0, webhooks: 0 };

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
    const raw = "otv_test_demo_key_change_me";
    this.apiKeys.set("key_demo", {
      id: "key_demo",
      projectId,
      name: "Demo key",
      prefix: "otv_test_",
      hash: hashKey(raw),
      scopes: ["verify:write", "verdicts:read", "webhooks:write"],
      createdAt: new Date().toISOString(),
    });
  }

  authenticate(apiKey?: string): ApiKeyRecord | null {
    if (!apiKey) return null;
    const hash = hashKey(apiKey);
    for (const key of this.apiKeys.values()) {
      if (!key.revokedAt && key.hash === hash) return key;
    }
    return null;
  }

  createApiKey(projectId: string, name: string): { record: ApiKeyRecord; raw: string } {
    const raw = `otv_live_${randomBytes(24).toString("hex")}`;
    const record: ApiKeyRecord = {
      id: `key_${randomBytes(6).toString("hex")}`,
      projectId,
      name,
      prefix: raw.slice(0, 12),
      hash: hashKey(raw),
      scopes: ["verify:write", "verdicts:read", "webhooks:write"],
      createdAt: new Date().toISOString(),
    };
    this.apiKeys.set(record.id, record);
    this.audit.push({
      id: `aud_${randomBytes(4).toString("hex")}`,
      at: new Date().toISOString(),
      actor: "system",
      action: "api_key.created",
      meta: { keyId: record.id },
    });
    return { record, raw };
  }

  saveVerdict(v: Verdict): void {
    this.verdicts.set(v.verdictId, v);
    this.usage.verifications += 1;
  }
}

export const store = new MemoryStore();
export const DEMO_API_KEY = "otv_test_demo_key_change_me";
