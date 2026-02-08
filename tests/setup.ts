import '@testing-library/jest-dom';

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
