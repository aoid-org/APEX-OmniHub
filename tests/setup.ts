import '@testing-library/jest-dom';

// Mock Supabase environment variables for testing execution (Critical for Gate 3)
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'mock-key-for-testing';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key-for-testing';

// Configure HTTP proxy for Supabase integration tests in sandboxed environments
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
if (httpProxy) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ProxyAgent, setGlobalDispatcher } = require('undici');
    setGlobalDispatcher(new ProxyAgent(httpProxy));
  } catch {
    // undici not available — integration tests will skip via DNS failure
  }
}
