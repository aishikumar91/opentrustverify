import { IncomingClaimSchema, type IncomingClaim, type Verdict, VerdictSchema } from "@otv/verdict-schema";

export interface OtvClientOptions {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof fetch;
}

export class OtvApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private fetchImpl: typeof fetch;

  constructor(opts: OtvClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    // Bind fetch — bare `fetch` loses Window context in browsers ("Illegal invocation")
    this.fetchImpl = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      h.Authorization = `Bearer ${this.apiKey}`;
      h["X-OTV-Api-Key"] = this.apiKey;
    }
    return h;
  }

  async health(): Promise<{ status: string; product: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/health`);
    if (!res.ok) throw new Error(`health failed: ${res.status}`);
    return res.json();
  }

  async verifyIncoming(claim: IncomingClaim): Promise<Verdict> {
    IncomingClaimSchema.parse(claim);
    const res = await this.fetchImpl(`${this.baseUrl}/v1/verify/incoming`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(claim),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`verify failed: ${res.status} ${text}`);
    }
    return VerdictSchema.parse(await res.json());
  }

  async getVerdict(id: string): Promise<Verdict> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/verdicts/${id}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`getVerdict failed: ${res.status}`);
    return VerdictSchema.parse(await res.json());
  }

  async verifySignature(verdict: Verdict): Promise<{ valid: boolean }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/verdicts/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verdict),
    });
    if (!res.ok) throw new Error(`verifySignature failed: ${res.status}`);
    return res.json();
  }

  async listChains(): Promise<Array<{ id: string; networks: string[] }>> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/chains`);
    if (!res.ok) throw new Error(`listChains failed: ${res.status}`);
    return res.json();
  }
}
