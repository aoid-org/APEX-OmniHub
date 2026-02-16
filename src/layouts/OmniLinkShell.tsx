import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { OmniSupportWidget } from '@/components/global/OmniSupportWidget';

interface OmniLinkShellProps {
  children: ReactNode;
}

export function OmniLinkShell({ children }: OmniLinkShellProps) {
  return (
    <div data-testid="omnilink-shell">
      <DashboardLayout>
        {children}
      </DashboardLayout>
      <OmniSupportWidget />
    </div>
  );
}
