import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// User's own Supabase (highest priority)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Accept multiple key formats for user-provided keys
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for test environment - robust detection for CI/Test runners
// 1. Vitest sets import.meta.env.MODE to 'test'
// 2. Node test runners set process.env.NODE_ENV to 'test'
// 3. CI pipelines detected via VITE_IS_CI injected define
const isTestEnv =
  import.meta.env.MODE === 'test' ||
  import.meta.env.VITE_IS_CI === 'true' ||
  (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || (process.env.CI === 'true' && process.env.NODE_ENV !== 'production')));

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');

  const errorMessage = `APEX Critical Failure: Supabase env vars missing (${missing.join(', ')}). Aborting Launch.`;

  if (isTestEnv) {
    // Soft failure for tests - log warning but don't crash
    console.warn(`[TEST MODE] ${errorMessage} - Proceeding with unavailable client stub.`);
  } else {
    // Hard crash for production/dev
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
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

export const supabase = (!SUPABASE_URL || !SUPABASE_KEY) && isTestEnv
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
