/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OTV_API_URL?: string;
  readonly VITE_OTV_API_KEY?: string;
  readonly VITE_OTV_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
