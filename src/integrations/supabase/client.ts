import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function getEnv(): Record<string, string | undefined> {
  if (typeof import.meta !== 'undefined') {
    const metaEnv = (import.meta as { env?: unknown }).env;
    if (metaEnv && typeof metaEnv === 'object') {
      return metaEnv as Record<string, string | undefined>;
    }
  }
  return (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;
}

const env = getEnv();

// User's own Supabase (highest priority)
const SUPABASE_URL =
  env?.VITE_SUPABASE_URL ?? (env as Record<string, string | undefined>)?.SUPABASE_URL;

// Accept multiple key formats for user-provided keys
const SUPABASE_KEY =
  env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env?.VITE_SUPABASE_ANON_KEY ??
  (env as Record<string, string | undefined>)?.SUPABASE_SERVICE_ROLE_KEY;

const missingEnv = !SUPABASE_URL || !SUPABASE_KEY;

// When env vars are missing
// fall back to a safe stub so the app can render the setup screen
// instead of crashing on import.
function createUnavailableClient() {
  const err = new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );

  const reject = async () => {
    throw err;
  };

  const noopSubscription = { unsubscribe: () => {} };

  return {
    auth: {
      getSession: reject,
      signOut: reject,
      onAuthStateChange: () => ({ data: { subscription: noopSubscription } }),
    },
    functions: {
      invoke: reject,
    },
    from: () => ({
      select: reject,
      insert: reject,
      update: reject,
      delete: reject,
      eq: reject,
    }),
  } as unknown as ReturnType<typeof createClient<Database>>;
}

if (missingEnv) {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');

  const devFlag =
    (env as Record<string, string | undefined>)?.DEV === 'true' ||
    (env as Record<string, string | undefined>)?.NODE_ENV === 'development';

  if (devFlag) {
    console.warn(
      `⚠️ Supabase env vars missing (${missing.join(
        ', '
      )}). Rendering will degrade to setup screen until provided.`
    );
  }
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = missingEnv
  ? createUnavailableClient()
  : createClient<Database>(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

// Log which Supabase instance is being used (dev only)
if (!missingEnv) {
  const devFlag =
    (env as Record<string, string | undefined>)?.DEV === 'true' ||
    (env as Record<string, string | undefined>)?.NODE_ENV === 'development';
  if (devFlag) {
    console.log('✅ Using Supabase instance:', SUPABASE_URL);
  }
}
