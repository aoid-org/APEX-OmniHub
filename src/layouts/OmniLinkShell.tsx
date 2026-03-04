import { ReactNode } from 'react';
import { OmniSupportWidget } from '@/components/global/OmniSupportWidget';

interface OmniLinkShellProps {
  children: ReactNode;
}

export function OmniLinkShell({ children }: Readonly<OmniLinkShellProps>) {
  return (
    <div data-testid="omnilink-shell" className="min-h-screen bg-[#0a0e1a] text-slate-100">
      {children}
      <OmniSupportWidget />
    </div>
  );
}
