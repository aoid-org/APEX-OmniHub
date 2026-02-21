import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// User's own Supabase (highest priority)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Accept multiple key formats for user-provided keys
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');

  const errorMessage = `Supabase env vars missing (${missing.join(', ')}). Using unavailable client stub.`;
  console.warn(errorMessage);
}

// Helper to create a stub client that throws helpful errors when methods are called
function createUnavailableClient() {
  const err = new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );

  const reject = async () => {
    throw err;
  };

  const noopSubscription = { unsubscribe: () => {} };

  // Return a safe "logged out" state for auth to prevent app crashes on startup
  const resolveNull = async () => ({ data: { session: null, user: null }, error: null });

  return {
    auth: {
      getSession: resolveNull,
      getUser: resolveNull,
      signOut: resolveNull,
      onAuthStateChange: () => ({ data: { subscription: noopSubscription } }),
      signInWithPassword: reject,
      signUp: reject,
      signInWithOAuth: reject,
      resetPasswordForEmail: reject,
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
    storage: {
      from: () => ({
        upload: reject,
        download: reject,
        list: reject,
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
      listBuckets: reject,
      createBucket: reject,
      deleteBucket: reject,
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
    rpc: reject,
  } as unknown as ReturnType<typeof createClient<Database>>;
}

export const supabase = (!SUPABASE_URL || !SUPABASE_KEY)
  ? createUnavailableClient()
  : createClient<Database>(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        // Safer access to localStorage for SSR/non-browser environments
        storage: typeof globalThis.window === 'undefined' ? undefined : globalThis.window.localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

// Log which Supabase instance is being used (dev only)
if (import.meta.env.DEV && SUPABASE_URL) {
  console.log('✅ Using Supabase instance:', SUPABASE_URL);
}
