import { expect, test, describe } from 'vitest';
import { toOmniDashUI, toOmniDashUIList } from './index';
import type { RegistryApp } from './types';

describe('toOmniDashUI', () => {
  test('maps a full RegistryApp correctly', () => {
    const input: RegistryApp = {
      id: 'app-1',
      displayName: 'App One',
      connectionStatus: 'connected',
      meta: { iconUrl: 'https://example.com/icon.png' },
      allowedActions: [
        { key: 'action-1', label: 'Action 1', enabled: true },
        { key: 'action-2', label: 'Action 2', enabled: false },
      ],
      customField: 'some-value'
    };

    const result = toOmniDashUI(input);

    expect(result.id).toBe('app-1');
    expect(result.label).toBe('App One');
    expect(result.iconUrl).toBe('https://example.com/icon.png');
    expect(result.status).toBe('connected');
    expect(result.actions).toEqual([
      { key: 'action-1', label: 'Action 1', disabled: false },
      { key: 'action-2', label: 'Action 2', disabled: true },
    ]);
    expect(result.raw).toBe(input);
  });

  test('handles missing optional fields and uses defaults', () => {
    const input: RegistryApp = {
      id: 'app-2',
      connectionStatus: 'disconnected',
    };

    const result = toOmniDashUI(input);

    expect(result.id).toBe('app-2');
    expect(result.label).toBe('app-2'); // defaults to id
    expect(result.iconUrl).toBeNull(); // defaults to null
    expect(result.status).toBe('disconnected');
    expect(result.actions).toEqual([]); // defaults to empty array
    expect(result.raw).toBe(input);
  });

  test('handles meta without iconUrl', () => {
    const input: RegistryApp = {
      id: 'app-3',
      connectionStatus: 'error',
      meta: { otherField: 123 },
    };

    const result = toOmniDashUI(input);

    expect(result.iconUrl).toBeNull();
  });
});

describe('toOmniDashUIList', () => {
  test('maps a list of RegistryApps', () => {
    const apps: RegistryApp[] = [
      { id: 'app-1', connectionStatus: 'connected' },
      { id: 'app-2', connectionStatus: 'pending' },
    ];

    const result = toOmniDashUIList(apps);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('app-1');
    expect(result[1].id).toBe('app-2');
  });
});
