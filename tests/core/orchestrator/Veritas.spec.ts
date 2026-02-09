/**
 * Tests for Veritas — tool output validation.
 * @date 2026-02-09
 */
import { describe, expect, it } from 'vitest';

import { validate } from '../../../src/core/orchestrator/Veritas';

describe('Veritas', () => {
  it('validates search_database with data field', () => {
    const result = validate('search_database', {
      data: [],
      count: 0,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects search_database without data', () => {
    const result = validate('search_database', { count: 0 });
    expect(result.valid).toBe(false);
  });

  it('validates create_record with id field', () => {
    const result = validate('create_record', {
      id: 'abc',
      success: true,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects create_record without id or success', () => {
    const result = validate('create_record', { data: 'x' });
    expect(result.valid).toBe(false);
  });

  it('validates send_email with success flag', () => {
    const result = validate('send_email', { success: true });
    expect(result.valid).toBe(true);
  });

  it('rejects send_email without success flag', () => {
    const result = validate('send_email', { data: 'x' });
    expect(result.valid).toBe(false);
  });

  it('passes unknown tools through', () => {
    const result = validate('some_future_tool', {
      anything: true,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects non-object results', () => {
    const result = validate('send_email', 'not an object');
    expect(result.valid).toBe(false);
  });

  it('rejects null results', () => {
    const result = validate('send_email', null);
    expect(result.valid).toBe(false);
  });
});
