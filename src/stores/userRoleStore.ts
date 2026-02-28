/**
 * src/stores/userRoleStore.ts — User Role Context
 * Provides hydrated permission arrays for RBAC gating.
 * APEX-OmniHub v1.3.0-RC  §Security Gate
 */

import { create } from 'zustand';

export interface UserRoleState {
  permissions: string[];
  role: string | null;
  hydrated: boolean;
  setRole: (role: string, permissions: string[]) => void;
  clear: () => void;
}

export const useUserRole = create<UserRoleState>((set) => ({
  permissions: [],
  role: null,
  hydrated: false,
  setRole: (role, permissions) => set({ role, permissions, hydrated: true }),
  clear: () => set({ permissions: [], role: null, hydrated: false }),
}));
