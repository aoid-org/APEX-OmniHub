/**
 * useExecute - Unified action execution hook
 * 
 * Routes actions to demo store or live API based on current mode.
 * Provides consistent interface regardless of mode.
 */

import { useCallback } from 'react';
import { useAccess } from '@/contexts/AccessContext';
import { useDemoStore } from '@/stores/demoStore';

type ActionType =
  | 'entity.create'
  | 'entity.update'
  | 'entity.delete'
  | 'task.create'
  | 'task.update'
  | 'approval.approve'
  | 'approval.reject'
  | 'event.log';

interface ExecuteOptions {
  optimistic?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseExecuteReturn {
  /**
   * Execute an action (routed to demo store or live API)
   */
  execute: <T extends Record<string, unknown>>(
    action: ActionType,
    payload: T,
    options?: ExecuteOptions
  ) => Promise<void>;
  
  /**
   * Whether currently in demo mode
   */
  isDemo: boolean;
}

export function useExecute(): UseExecuteReturn {
  const { isDemo } = useAccess();
  const demoStore = useDemoStore();

  const execute = useCallback(
    async <T extends Record<string, unknown>>(
      action: ActionType,
      payload: T,
      options?: ExecuteOptions
    ): Promise<void> => {
      try {
        if (isDemo) {
          // Demo mode: mutate local store
          switch (action) {
            case 'entity.create':
              demoStore.addEntity(payload as unknown as Parameters<typeof demoStore.addEntity>[0]);
              break;
            case 'entity.update':
              demoStore.updateEntity(
                payload.id as string,
                payload.updates as Parameters<typeof demoStore.updateEntity>[1]
              );
              break;
            case 'entity.delete':
              demoStore.deleteEntity(payload.id as string);
              break;
            case 'task.create':
              demoStore.addTask(payload as unknown as Parameters<typeof demoStore.addTask>[0]);
              break;
            case 'task.update':
              demoStore.updateTask(
                payload.id as string,
                payload.updates as Parameters<typeof demoStore.updateTask>[1]
              );
              break;
            case 'approval.approve':
              demoStore.approveItem(payload.id as string);
              break;
            case 'approval.reject':
              demoStore.rejectItem(payload.id as string);
              break;
            case 'event.log':
              demoStore.addEvent(payload as unknown as Parameters<typeof demoStore.addEvent>[0]);
              break;
          }
        } else {
          // Live mode: call real API
          // NOTE: Live API endpoints will be wired when backend is ready
          throw new Error(`Live API not implemented for action: ${action}`);
        }

        options?.onSuccess?.();
      } catch (error) {
        options?.onError?.(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
    [isDemo, demoStore]
  );

  return {
    execute,
    isDemo,
  };
}
