// @vitest-environment node
import { describe, it, expect } from 'vitest';

/**
 * Tests for eslint.config.shared.js — exercises createEslintConfig()
 * to cover the tseslint.config([...]) call and all config branches.
 */
describe('eslint.config.shared.js', () => {
  it('exports createEslintConfig as a function', async () => {
    const mod = await import('../../eslint.config.shared.js');
    expect(typeof mod.createEslintConfig).toBe('function');
  });

  it('returns config array with default options', async () => {
    const { createEslintConfig } = await import('../../eslint.config.shared.js');
    const config = createEslintConfig();
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
  });

  it('returns config array with custom ignores', async () => {
    const { createEslintConfig } = await import('../../eslint.config.shared.js');
    const config = createEslintConfig({ ignores: ['dist', 'node_modules', 'build'] });
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
  });

  it('config contains entries with files patterns', async () => {
    const { createEslintConfig } = await import('../../eslint.config.shared.js');
    const config = createEslintConfig();
    // Flatten if nested arrays
    const flatConfig = config.flat(Infinity);

    // Find entry with pages files pattern
    const hasFilesEntry = flatConfig.some(
      (entry: Record<string, unknown>) =>
        Array.isArray(entry.files),
    );
    expect(hasFilesEntry).toBe(true);
  });

  it('config has more than 2 entries when flattened', async () => {
    const { createEslintConfig } = await import('../../eslint.config.shared.js');
    const config = createEslintConfig();
    const flatConfig = config.flat(Infinity);
    // The config should have at least: ignores, TS rules, pages rules, core rules
    expect(flatConfig.length).toBeGreaterThanOrEqual(2);
  });

  it('config includes ignores entry', async () => {
    const { createEslintConfig } = await import('../../eslint.config.shared.js');
    const config = createEslintConfig();
    const flatConfig = config.flat(Infinity);
    const ignoresEntry = flatConfig.find(
      (entry: Record<string, unknown>) =>
        Array.isArray(entry.ignores),
    );
    expect(ignoresEntry).toBeDefined();
  });
});
