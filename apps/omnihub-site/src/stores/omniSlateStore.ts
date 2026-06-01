/**
 * OmniSlate Universal Context Store
 * @version 1.0.0
 * @module apps/omnihub-site/src/stores/omniSlateStore
 *
 * Global Zustand store for OmniSlate Contexts.
 * OmniBoard and OmniModal can pass context hands-off here.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Duplicate contexts are safely merged/replaced by ID
 * - Modularity: Pure Zustand store — zero React dependencies
 */

import { create } from 'zustand';
import type { ContextItem } from '../../dashboard/types/context.types';

interface OmniSlateState {
  readonly contextItems: ContextItem[];
  addContext: (item: ContextItem) => void;
  removeContext: (id: string) => void;
  clearContexts: () => void;
}

export const useOmniSlateStore = create<OmniSlateState>((set) => ({
  contextItems: [],

  addContext: (item) => set((state) => {
    const existingIndex = state.contextItems.findIndex(c => c.id === item.id);
    if (existingIndex >= 0) {
      const newItems = [...state.contextItems];
      newItems[existingIndex] = item;
      return { contextItems: newItems };
    }
    return { contextItems: [...state.contextItems, item] };
  }),

  removeContext: (id) => set((state) => ({
    contextItems: state.contextItems.filter(c => c.id !== id)
  })),

  clearContexts: () => set({ contextItems: [] }),
}));
