import { OtvApiClient } from "@otv/api-client";

const BASE_KEY = "otv_api_base";
const KEY_KEY = "otv_api_key";

function stored(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(key);
}

export function apiBase(): string {
  const fromStore = stored(BASE_KEY);
  const raw =
    fromStore && /^https?:\/\//.test(fromStore)
      ? fromStore
      : (import.meta.env.VITE_OTV_API_URL ?? "https://otv.poptrust.me");
  return raw.replace(/\/$/, "");
}

export function storedApiKey(): string | undefined {
  const value = stored(KEY_KEY)?.trim();
  return value ? value : undefined;
}

export function saveBrowserConnection(input: { baseUrl?: string; apiKey?: string | null }) {
  if (typeof localStorage === "undefined") return;
  if (input.baseUrl !== undefined) {
    const clean = input.baseUrl.trim().replace(/\/$/, "");
    if (clean) localStorage.setItem(BASE_KEY, clean);
    else localStorage.removeItem(BASE_KEY);
  }
  if (input.apiKey !== undefined) {
    const clean = input.apiKey?.trim() ?? "";
    if (clean) localStorage.setItem(KEY_KEY, clean);
    else localStorage.removeItem(KEY_KEY);
  }
  window.dispatchEvent(new Event("otv-connection"));
}

export const API_BASE = apiBase();

export const SESSION_STORAGE_KEY = "otv_session_token";

export function createClient(sessionToken?: string | null, apiKey?: string) {
  return new OtvApiClient({
    baseUrl: apiBase(),
    sessionToken: sessionToken ?? undefined,
    apiKey: apiKey ?? storedApiKey(),
  });
}

export const publicClient = createClient();
