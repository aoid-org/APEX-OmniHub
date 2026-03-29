import { describe, it, expect, mock } from 'bun:test';

describe('test', () => {
  it('tests', () => {
    const fn = mock();
    expect(fn).toHaveBeenCalledWith('online', expect.any(Function));
  });
});
