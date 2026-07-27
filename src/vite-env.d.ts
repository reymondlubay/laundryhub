/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_NAME_PROJECT?: string;
  readonly VITE_COMPANY_NAME?: string;
  readonly VITE_COMPANY_LOGO_URL?: string;
  readonly VITE_COMPANY_LOGO_URL_LIGHT?: string;
  /** Set to `Dev` for development banner. Omit for production. */
  readonly ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
