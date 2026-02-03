import { useContext } from 'react';
import type { AccessScope } from '@/features/registry';
import { AccessContext, type AccessContextValue } from './AccessContext';

export function useAccess(): AccessContextValue {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
}

/**
 * Hook to check if current user can access a specific scope
 */
export function useCanAccess(requiredScopes: readonly AccessScope[]): boolean {
  const { userScopes } = useAccess();
  return requiredScopes.every(
    (scope) => userScopes.includes(scope) || scope === 'public'
  );
}
