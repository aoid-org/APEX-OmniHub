import { describe, it, expect } from 'vitest';
import { normalizeModuleItems } from '../../supabase/functions/_shared/omniport-normalize.ts';

describe('Module Items Normalization Contract', () => {
  it('should normalize valid inputs into canonical shape', () => {
    const rawItems = [
      { id: '1', label: 'Item 1', status: 'active' },
      { key: '2', title: 'Item 2', state: 'stopped', description: 'Some detail' },
      { name: '3', url: 'https://example.com', active: true },
    ];

    const normalized = normalizeModuleItems(rawItems);

    expect(normalized).toHaveLength(3);
    
    expect(normalized[0]).toEqual({
      id: '1',
      label: 'Item 1',
      status: 'active'
    });

    expect(normalized[1]).toEqual({
      id: '2',
      label: 'Item 2',
      status: 'inactive',
      detail: 'Some detail'
    });

    expect(normalized[2]).toEqual({
      id: '3',
      label: '3',
      status: 'active'
    });
  });

  it('should handle falsy and malformed inputs', () => {
    const rawItems = [null, undefined, 'string', 42, {}];
    
    const normalized = normalizeModuleItems(rawItems);
    
    expect(normalized).toHaveLength(5);
    expect(normalized[0].status).toBe('unknown');
    expect(normalized[1].status).toBe('unknown');
    expect(normalized[2].status).toBe('unknown');
    expect(normalized[3].status).toBe('unknown');
    
    // The empty object {} should map to item-4
    expect(normalized[4].id).toBe('item-4');
    expect(normalized[4].label).toBe('item-4');
    expect(normalized[4].status).toBe('unknown');
  });
});
