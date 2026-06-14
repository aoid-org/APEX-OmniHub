// Root-package stub consumed by the Vitest module graph.
//
// vitest.config.ts intentionally maps '@' -> ./src so tests exercise a
// lightweight auth double, while vite.config.ts and the production build map
// '@' -> ./apps/omnihub-site/src (the Supabase-backed canonical implementation).
// This stub mirrors the canonical return shape so the type checker agrees with
// the real implementation; tests still override behaviour via vi.mock().
import type { Session } from '@supabase/supabase-js';

export function useAuth(): {
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
} {
  return { session: null, loading: false, isAuthenticated: false };
}
