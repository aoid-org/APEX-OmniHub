import { describe, it, expect, beforeEach } from 'vitest';
import { useUserRole } from '@/stores/userRoleStore';

describe('userRoleStore', () => {
  beforeEach(() => {
    useUserRole.getState().clear();
  });

  it('should initialize with empty permissions and null role', () => {
    const state = useUserRole.getState();
    expect(state.permissions).toEqual([]);
    expect(state.role).toBeNull();
    expect(state.hydrated).toBe(false);
  });

  it('should set role and permissions via setRole', () => {
    useUserRole.getState().setRole('admin', ['read', 'write', 'delete']);
    const state = useUserRole.getState();
    expect(state.role).toBe('admin');
    expect(state.permissions).toEqual(['read', 'write', 'delete']);
    expect(state.hydrated).toBe(true);
  });

  it('should clear state back to defaults', () => {
    useUserRole.getState().setRole('editor', ['read', 'write']);
    useUserRole.getState().clear();
    const state = useUserRole.getState();
    expect(state.permissions).toEqual([]);
    expect(state.role).toBeNull();
    expect(state.hydrated).toBe(false);
  });

  it('should overwrite previous role when setRole is called again', () => {
    useUserRole.getState().setRole('admin', ['all']);
    useUserRole.getState().setRole('viewer', ['read']);
    const state = useUserRole.getState();
    expect(state.role).toBe('viewer');
    expect(state.permissions).toEqual(['read']);
  });

  it('should handle empty permissions array', () => {
    useUserRole.getState().setRole('guest', []);
    const state = useUserRole.getState();
    expect(state.role).toBe('guest');
    expect(state.permissions).toEqual([]);
    expect(state.hydrated).toBe(true);
  });
});
