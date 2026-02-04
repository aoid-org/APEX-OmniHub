import { describe } from 'vitest'

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
    
  const hasCreds = Boolean(supabaseUrl && supabaseKey)
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
