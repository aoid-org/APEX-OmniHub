import '@testing-library/jest-dom';
import { MockAgent, setGlobalDispatcher } from 'undici';

const mockAgent = new MockAgent();
mockAgent.disableNetConnect(); // Prevent all unmocked test network leakage
setGlobalDispatcher(mockAgent);

const loggerMock = mockAgent.get('http://127.0.0.1:7245');
loggerMock.intercept({ path: () => true }).reply(200, {}).persist();

// Mocks removed to rely on vitest.config.ts injected local emulator credentials

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
