/**
 * useExecute - Demo store action dispatcher
 *
 * Provides a uniform interface for OmniDash components to mutate the
 * local demo store in demo mode. In live mode, components perform their
 * own Supabase/edge-function calls directly (see Tasks.tsx, Today.tsx
 * createTaskMutation for the live path) and should guard all execute()
 * calls with `if (isDemo)` to prevent accidental invocation.
 *
 * execute() is intentionally a no-op in live mode. Live mutations are
 * NOT routed through this hook — they belong in TanStack useMutation
 * handlers alongside their corresponding useQuery invalidation logic.
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
   * Dispatch a demo-store mutation. Must only be called when isDemo === true.
   * In live mode this is a no-op — live mutations belong in useMutation handlers.
   */
  execute: <T extends Record<string, unknown>>(
    action: ActionType,
    payload: T,
    options?: ExecuteOptions
  ) => Promise<void>;

  /** Whether the session is currently in demo mode. */
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
      // execute() is scoped to demo mode only. All call sites must guard
      // with `if (isDemo)` before invoking this function.
      if (!isDemo) return;

      try {
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

