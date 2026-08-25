import { OtvApiClient, type OtvClientOptions } from "@otv/api-client";
import type { IncomingClaim, Verdict } from "@otv/verdict-schema";

export interface VerifyIncomingResult {
  status: Verdict["status"];
  confidence: number;
  evidence: Verdict["evidence"];
  finality: Verdict["finality"];
  balance?: string;
  risk: Verdict["risk"];
  signature?: string;
  verdict: Verdict;
}

export class OpenTrustVerify {
  private client: OtvApiClient;

  constructor(opts: OtvClientOptions) {
    this.client = new OtvApiClient(opts);
  }

  async verifyIncomingTransfer(claim: IncomingClaim): Promise<VerifyIncomingResult> {
    const verdict = await this.client.verifyIncoming(claim);
    return {
      status: verdict.status,
      confidence: verdict.confidence,
      evidence: verdict.evidence,
      finality: verdict.finality,
      balance: verdict.balanceDelta,
      risk: verdict.risk,
      signature: verdict.signature,
      verdict,
    };
  }

  getVerdict(id: string) {
    return this.client.getVerdict(id);
  }

  verifySignature(verdict: Verdict) {
    return this.client.verifySignature(verdict);
  }

  health() {
    return this.client.health();
  }
}

export { OtvApiClient };
export type { IncomingClaim, Verdict, OtvClientOptions };
