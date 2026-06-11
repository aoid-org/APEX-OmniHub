import { describe, it, expect } from 'vitest';
import { compressTelegraphEnglish } from '../src/core/telegraph-english';

describe('Telegraph English', () => {
  it('compresses verbose phrases', () => {
    const input = 'In order to proceed, you must take into consideration the following rules.';
    expect(compressTelegraphEnglish(input)).toBe('to proceed, consider these rules.');
  });

  it('strips articles unambiguously in lists', () => {
    const input = '- the user must login\n- an admin can override\n1. the system resets';
    const output = compressTelegraphEnglish(input);
    expect(output).toContain('- user must login');
    expect(output).toContain('- admin can override');
    expect(output).toContain('1. system resets');
  });

  it('preserves code blocks entirely', () => {
    const input = 'In order to start, run ```npm run build```. That is to say, compile it.';
    expect(compressTelegraphEnglish(input)).toBe('to start, run ```npm run build```. i.e., compile it.');
  });

  it('preserves attention sinks', () => {
    const input = 'In order to bypass, you must provide the ADMIN_OVERRIDE token.';
    expect(compressTelegraphEnglish(input, ['ADMIN_OVERRIDE'])).toBe('to bypass, provide the ADMIN_OVERRIDE token.');
  });
});
