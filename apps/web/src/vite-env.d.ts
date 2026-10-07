/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OTV_API_URL?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_WEB3AUTH_CLIENT_ID?: string;
  readonly VITE_WEB3AUTH_NETWORK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
