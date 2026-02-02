/**
 * useExecute - Demo/Live Action Execution Hook
 * 
 * Provides unified action execution that works in both demo and live modes.
 * In demo mode: Runs demo() function + shows toast with Login CTA
 * In live mode: Runs live() function + handles errors via toast
 * 
 * NO SILENT NO-OPS - Every action provides feedback.
 * 
 * @example
 * const { execute, isExecuting } = useExecute();
 * 
 * await execute('createTask', {
 *   demo: () => demoStore.addTask({ action: 'test', payload: {} }),
 *   live: async () => await supabase.from('tasks').insert({ action: 'test' }),
 *   successMessage: 'Task created!',
 *   requiresAuth: true,
 * });
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessMode } from '@/contexts/AccessContext';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecuteOptions<T> {
  /** Function to run in demo mode */
  demo: () => T | Promise<T>;
  /** Function to run in live mode */
  live: () => T | Promise<T>;
  /** Success message to show */
  successMessage?: string;
  /** Error message prefix */
  errorMessage?: string;
  /** Whether this action requires authentication in demo mode (will show login CTA) */
  requiresAuth?: boolean;
  /** Custom demo toast message (overrides default) */
  demoToastMessage?: string;
}

export interface ExecuteResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface UseExecuteReturn {
  /** Execute an action with demo/live handling */
  execute: <T>(actionName: string, options: ExecuteOptions<T>) => Promise<ExecuteResult<T>>;
  /** Whether an action is currently executing */
  isExecuting: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useExecute(): UseExecuteReturn {
  const { isDemo, isAuthenticated } = useAccessMode();
  const navigate = useNavigate();
  const [isExecuting, setIsExecuting] = useState(false);

  const execute = useCallback(
    async <T>(_actionName: string, options: ExecuteOptions<T>): Promise<ExecuteResult<T>> => {
      const {
        demo,
        live,
        successMessage = 'Action completed',
        errorMessage = 'Action failed',
        requiresAuth = false,
        demoToastMessage,
      } = options;

      setIsExecuting(true);

      try {
        if (isDemo) {
          // DEMO MODE: Run demo function
          const result = await demo();

          // Show demo toast with optional login CTA
          const toastMessage = demoToastMessage || `${successMessage} (Demo)`;
          
          if (requiresAuth) {
            toast.info(toastMessage, {
              description: 'This is simulated. Log in to execute live.',
              action: {
                label: 'Log In',
                onClick: () => navigate('/auth'),
              },
              duration: 5000,
            });
          } else {
            toast.success(toastMessage, {
              description: 'Demo mode - changes saved locally',
              duration: 3000,
            });
          }

          return { success: true, data: result };
        }

        // LIVE MODE: Check auth if required
        if (requiresAuth && !isAuthenticated) {
          toast.error('Authentication Required', {
            description: 'Please log in to perform this action.',
            action: {
              label: 'Log In',
              onClick: () => navigate('/auth'),
            },
          });
          return { success: false, error: new Error('Not authenticated') };
        }

        // Run live function
        const result = await live();
        toast.success(successMessage);
        return { success: true, data: result };

      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        toast.error(errorMessage, {
          description: errorObj.message,
        });

        return { success: false, error: errorObj };
      } finally {
        setIsExecuting(false);
      }
    },
    [isDemo, isAuthenticated, navigate]
  );

  return { execute, isExecuting };
}

export default useExecute;
