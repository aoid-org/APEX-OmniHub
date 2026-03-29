import { describe } from 'vitest'

// Placeholder URLs/keys set by tests/setup.ts for unit test mocking —
// these must NOT be treated as real integration credentials.
const MOCK_PATTERNS = ['mock.supabase.co', '127.0.0.1:54321', 'localhost:54321']
const MOCK_KEY_PREFIXES = ['mock-', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQi']

function isPlaceholder(url: string, key: string): boolean {
  return MOCK_PATTERNS.some(p => url.includes(p))
    || MOCK_KEY_PREFIXES.some(p => key.startsWith(p))
}

export function getIntegrationConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
    ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? ''
  const requireIntegration = (process.env.REQUIRE_SUPABASE_INTEGRATION_TESTS ?? '')
    .toLowerCase() === 'true'
  const explicitlyDisabled = (process.env.REQUIRE_SUPABASE_INTEGRATION_TESTS ?? '')
    .toLowerCase() === 'false'

  const hasCreds = Boolean(supabaseUrl && supabaseKey && !isPlaceholder(supabaseUrl, supabaseKey))
  const shouldRun = hasCreds && !explicitlyDisabled

  // Cast describe.skip to work around type issues if needed, or just return check
  const suite = shouldRun ? describe : describe.skip
  
  return {
    supabaseUrl,
    supabaseKey,
    requireIntegration,
    explicitlyDisabled,
    hasCreds,
    shouldRun,
    suite
  }
}
