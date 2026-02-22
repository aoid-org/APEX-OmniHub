import { useState } from 'react';
import { Home, Link2, FileText, Zap, LogOut, Settings, Bot, LifeBuoy, LayoutDashboard, Plug, Activity } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useAdminAccess } from '@/omnidash/hooks';
import { useSystemHealth, type HealthStatus } from '@/hooks/useSystemHealth';
import { OmniBoardDialog } from '@/components/OmniBoard/OmniBoardDialog';

const getStatusColor = (status: HealthStatus) => {
  if (status === 'healthy') return 'bg-green-500';
  if (status === 'degraded') return 'bg-amber-500';
  return 'bg-red-600';
};

const getPingColor = (status: HealthStatus) => {
  if (status === 'healthy') return 'bg-green-400';
  if (status === 'degraded') return 'bg-amber-400';
  return 'bg-red-500';
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `transition-colors duration-150 ${
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-l-accent pl-2'
      : 'hover:bg-sidebar-accent/30 pl-2'
  }`;

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  useAdminAccess();
  const { status: healthStatus } = useSystemHealth();
  const isCollapsed = state === 'collapsed';
  const [omniBoardOpen, setOmniBoardOpen] = useState(false);

  const navItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Links', url: '/links', icon: Link2 },
    { title: 'Files', url: '/files', icon: FileText },
    { title: 'Automations', url: '/automations', icon: Zap },
  ];

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <div className="relative">
                <LayoutDashboard className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getPingColor(healthStatus)}`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getStatusColor(healthStatus)}`}
                  />
                </span>
              </div>
              {!isCollapsed && (
                <span className="font-semibold tracking-widest uppercase text-xs">
                  PLATFORM
                </span>
              )}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={navLinkClass}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* OmniBoard — opens dialog for connecting apps */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setOmniBoardOpen(true)}
                  className="hover:bg-sidebar-accent/30 pl-2 transition-colors duration-150 cursor-pointer"
                >
                  <Plug className="h-4 w-4" />
                  {!isCollapsed && (
                    <div className="flex flex-col leading-tight">
                      <span>OmniBoard</span>
                      <span className="text-[10px] text-muted-foreground">Connect Apps</span>
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* OmniDash — command center */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/omnidash" className={navLinkClass}>
                    <Activity className="h-4 w-4" />
                    {!isCollapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>OmniDash</span>
                        <span className="text-[10px] text-muted-foreground">Command Center</span>
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings - separated */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings" className={navLinkClass}>
                    <Settings className="h-4 w-4" />
                    {!isCollapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* APEX Assistant */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/apex" className={navLinkClass}>
                    <Bot className="h-4 w-4" />
                    {!isCollapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>APEX Assistant</span>
                        <span className="text-[10px] text-muted-foreground">AI Agent</span>
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="space-y-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="/support" className="hover:bg-sidebar-accent/30 pl-2 transition-colors duration-150">
                  <LifeBuoy className="h-4 w-4" />
                  {!isCollapsed && <span>Support</span>}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="border-t border-sidebar-border pt-2" />
          <Button
            variant="ghost"
            size={isCollapsed ? 'icon' : 'default'}
            onClick={signOut}
            className="w-full opacity-60 hover:opacity-100 transition-opacity"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>

      {/* OmniBoard Dialog */}
      <OmniBoardDialog open={omniBoardOpen} onOpenChange={setOmniBoardOpen} />
    </Sidebar>
  );
}
