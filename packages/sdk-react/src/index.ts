import { useMutation, useQuery } from "@tanstack/react-query";
import { OpenTrustVerify, type OtvClientOptions } from "@otv/sdk-core";
import type { IncomingClaim } from "@otv/verdict-schema";
import { useMemo } from "react";

export function useOtvClient(opts: OtvClientOptions) {
  return useMemo(() => new OpenTrustVerify(opts), [opts.baseUrl, opts.apiKey]);
}

export function useIncomingVerification(opts: OtvClientOptions) {
  const client = useOtvClient(opts);
  return useMutation({
    mutationFn: (claim: IncomingClaim) => client.verifyIncomingTransfer(claim),
  });
}

export function useVerification(opts: OtvClientOptions, verdictId?: string) {
  const client = useOtvClient(opts);
  return useQuery({
    queryKey: ["otv", "verdict", verdictId],
    queryFn: () => client.getVerdict(verdictId!),
    enabled: Boolean(verdictId),
  });
}

export function useVerdict(opts: OtvClientOptions, verdictId?: string) {
  return useVerification(opts, verdictId);
}

export { OpenTrustVerify };
