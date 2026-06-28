/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_REQUEST_ACCESS: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MAESTRO_ENABLED: string;
  readonly VITE_CONNECT_AI_ENABLED?: string;
  readonly VITE_DASHBOARD_URL?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_ENABLE_OMNIMEDIA_DEMOS?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_CF_PAGES_URL?: string;
  readonly VITE_PHYSIOMNI_DEMO_ENABLED?: string;
  readonly VITE_PHYSIOMNI_LIVE_ENABLED?: string;
  readonly VITE_PHYSIOMNI_PHYSICAL_ACTIONS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
