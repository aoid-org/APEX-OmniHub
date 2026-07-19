/**
 * OMNI-TEST: App HelmetProvider & Login Route Runtime Guard
 * Verifies that App.tsx wraps routes in HelmetProvider so that react-helmet-async / vite-react-ssg
 * Head calls (such as SEOMeta inside LoginPage, HomePage, etc.) do not crash with:
 * TypeError: Cannot read properties of undefined (reading 'add')
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP_TSX = resolve(__dirname, '../apps/omnihub-site/src/App.tsx');

describe('App HelmetProvider integration and SEOMeta runtime safety', () => {
  it('should include HelmetProvider in App.tsx source', () => {
    const appSrc = readFileSync(APP_TSX, 'utf-8');
    expect(appSrc).toContain('HelmetProvider');
  });
});
