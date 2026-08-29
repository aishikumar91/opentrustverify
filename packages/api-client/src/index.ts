import { IncomingClaimSchema, type IncomingClaim, type Verdict, VerdictSchema } from "@otv/verdict-schema";

export interface OtvClientOptions {
  baseUrl: string;
  apiKey?: string;
  sessionToken?: string;
  fetch?: typeof fetch;
}

export interface OtvUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: OtvUser;
  expiresAt: string;
  sessionToken: string;
}

export interface PublicApiKey {
  id: string;
  projectId: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
}

export interface PublicWebhook {
  id: string;
  projectId: string;
  url: string;
  events: string[];
  createdAt: string;
}

export class OtvApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string
  ) {
    super(message);
  }
}

export class OtvApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private sessionToken?: string;
  private fetchImpl: typeof fetch;

  constructor(opts: OtvClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.sessionToken = opts.sessionToken;
    this.fetchImpl = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  setSessionToken(token?: string): void {
    this.sessionToken = token;
  }

  setApiKey(apiKey?: string): void {
    this.apiKey = apiKey;
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      h.Authorization = `Bearer ${this.apiKey}`;
      h["X-OTV-Api-Key"] = this.apiKey;
    }
    if (this.sessionToken) {
      h["X-OTV-Session"] = this.sessionToken;
    }
    return h;
  }

  private async parse<T>(res: Response, label: string): Promise<T> {
    if (!res.ok) {
      const text = await res.text();
      throw new OtvApiError(`${label} failed: ${res.status} ${text}`, res.status, text);
    }
    return res.json() as Promise<T>;
  }

  async health(): Promise<{ status: string; product: string; store?: string; domain?: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/health`);
    return this.parse(res, "health");
  }

  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/auth/register`, {
      method: "POST",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify({ email, password, name }),
    });
    return this.parse(res, "register");
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    return this.parse(res, "login");
  }

  async logout(): Promise<void> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/auth/logout`, {
      method: "POST",
      headers: this.headers(),
      credentials: "include",
    });
    await this.parse(res, "logout");
  }

  async me(): Promise<{ user: OtvUser; projectId?: string; orgId?: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/auth/me`, {
      headers: this.headers(),
      credentials: "include",
    });
    return this.parse(res, "me");
  }

  async verifyIncoming(claim: IncomingClaim): Promise<Verdict> {
    IncomingClaimSchema.parse(claim);
    const res = await this.fetchImpl(`${this.baseUrl}/v1/verify/incoming`, {
      method: "POST",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify(claim),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new OtvApiError(`verify failed: ${res.status} ${text}`, res.status, text);
    }
    return VerdictSchema.parse(await res.json());
  }

  async listVerdicts(query?: string): Promise<Verdict[]> {
    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await this.fetchImpl(`${this.baseUrl}/v1/verdicts${qs}`, {
      headers: this.headers(),
      credentials: "include",
    });
    const data = await this.parse<{ verdicts: unknown[] }>(res, "listVerdicts");
    return data.verdicts.map((v) => VerdictSchema.parse(v));
  }

  async getVerdict(id: string): Promise<Verdict> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/verdicts/${id}`, {
      headers: this.headers(),
      credentials: "include",
    });
    if (!res.ok) throw new OtvApiError(`getVerdict failed: ${res.status}`, res.status);
    return VerdictSchema.parse(await res.json());
  }

  async verifySignature(verdict: Verdict): Promise<{ valid: boolean; reason?: string; kid?: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/verdicts/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verdict),
    });
    return this.parse(res, "verifySignature");
  }

  async listChains(): Promise<Array<{ id: string; networks: string[] }>> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/chains`);
    return this.parse(res, "listChains");
  }

  async listApiKeys(): Promise<PublicApiKey[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/api-keys`, {
      headers: this.headers(),
      credentials: "include",
    });
    const data = await this.parse<{ keys: PublicApiKey[] }>(res, "listApiKeys");
    return data.keys;
  }

  async createApiKey(name?: string, projectId?: string): Promise<{ record: PublicApiKey; raw: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/api-keys`, {
      method: "POST",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify({ name, projectId }),
    });
    return this.parse(res, "createApiKey");
  }

  async listWebhooks(): Promise<PublicWebhook[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/webhooks`, {
      headers: this.headers(),
      credentials: "include",
    });
    const data = await this.parse<{ webhooks: PublicWebhook[] }>(res, "listWebhooks");
    return data.webhooks;
  }

  async createWebhook(
    url: string,
    events?: string[]
  ): Promise<{ id: string; secret: string; events: string[] }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/webhooks`, {
      method: "POST",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify({ url, events }),
    });
    return this.parse(res, "createWebhook");
  }

  async listAudit(): Promise<Array<{ id: string; at: string; actor: string; action: string }>> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/audit`, {
      headers: this.headers(),
      credentials: "include",
    });
    return this.parse(res, "listAudit");
  }

  async getBilling(): Promise<{ plan: string; plans: string[]; usage: { verifications: number; webhooks: number }; provider: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/billing`, {
      headers: this.headers(),
      credentials: "include",
    });
    return this.parse(res, "getBilling");
  }

  async getUsage(): Promise<{ verifications: number; webhooks: number }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/usage`, {
      headers: this.headers(),
      credentials: "include",
    });
    return this.parse(res, "getUsage");
  }
}
