import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { ProtectedRoute } from './ProtectedRoute';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isOmniDash = location.pathname.startsWith('/omnidash');

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            {!isOmniDash && (
              <header className="h-14 border-b flex items-center px-4">
                <SidebarTrigger />
              </header>
            )}
            <main className={`flex-1 ${isOmniDash ? '' : 'pb-16 md:pb-0'}`}>
              {children}
            </main>
          </div>
        </div>
        {isMobile && !isOmniDash && <MobileBottomNav />}
      </SidebarProvider>
    </ProtectedRoute>
  );
};