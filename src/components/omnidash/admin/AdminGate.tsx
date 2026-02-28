import { ReactNode } from 'react';
import { useUserRole } from '@/stores/userRoleStore';

interface AdminGateProps {
  children: ReactNode;
}

export function AdminGate({ children }: AdminGateProps) {
  const userRoleContext = useUserRole();

  // FAIL-CLOSED: Strictly evaluate permissions array.
  // Unhydrated context, missing payload, or missing role instantly defaults to false.
  const canMount = userRoleContext?.permissions?.includes('SYSTEM_ADMIN') ?? false;

  if (!canMount) {
    return null; // Zero DOM rendering. Absolute UI lock.
  }

  return <>{children}</>;
}
