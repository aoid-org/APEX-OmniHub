import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { MockAgent, setGlobalDispatcher } from 'undici';

// Mock HTMLMediaElement methods not implemented by JSDOM.
// These stubs prevent "Not implemented: HTMLMediaElement.prototype.pause/play"
// errors in any component test that mounts audio/video elements (e.g. ClientComputeNode).
// Guard required: node-environment specs (e.g. @vitest-environment node) lack JSDOM globals.
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
}

const mockAgent = new MockAgent();
mockAgent.disableNetConnect(); // Prevent all unmocked test network leakage
setGlobalDispatcher(mockAgent);

const loggerMock = mockAgent.get('http://127.0.0.1:7245');
loggerMock.intercept({ path: () => true, method: 'GET' }).reply(200, {}).persist();
loggerMock.intercept({ path: () => true, method: 'POST' }).reply(200, {}).persist();
loggerMock.intercept({ path: () => true, method: 'OPTIONS' }).reply(200, {}).persist();
loggerMock.intercept({ path: () => true, method: 'PUT' }).reply(200, {}).persist();

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

// ─── Framer Motion — jsdom DOM-prop bleed prevention ─────────────────────────
// Delegates to __mocks__/framer-motion.ts (synchronous ESM, no require()).
// The factory-less call tells Vitest to use the adjacent __mocks__ file,
// avoiding the async-factory timing race that caused props to bleed through.
vi.mock('framer-motion');
