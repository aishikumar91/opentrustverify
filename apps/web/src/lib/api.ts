import { OtvApiClient } from "@otv/api-client";

export const API_BASE = (import.meta.env.VITE_OTV_API_URL ?? "https://otv.poptrust.me").replace(
  /\/$/,
  ""
);

export const SESSION_STORAGE_KEY = "otv_session_token";

export function createClient(sessionToken?: string | null, apiKey?: string) {
  return new OtvApiClient({
    baseUrl: API_BASE,
    sessionToken: sessionToken ?? undefined,
    apiKey,
  });
}

export const publicClient = createClient();
