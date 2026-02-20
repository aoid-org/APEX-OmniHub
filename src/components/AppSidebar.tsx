import { Home, Link2, FileText, Zap, Package, LogOut, Brain } from 'lucide-react';
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

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  useAdminAccess();
  const isCollapsed = state === 'collapsed';

  const navItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Links', url: '/links', icon: Link2 },
    { title: 'Files', url: '/files', icon: FileText },
    { title: 'Automations', url: '/automations', icon: Zap },
    { title: 'Integrations', url: '/integrations', icon: Package },
    { title: 'APEX Assistant', url: '/apex', icon: Brain },
  ];

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {!isCollapsed && (
                <span className="font-semibold tracking-widest uppercase text-xs bg-gradient-to-r from-navy to-accent bg-clip-text text-transparent">
                  OmniLink
                </span>
              )}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `transition-colors duration-150 ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-l-accent pl-2'
                            : 'hover:bg-sidebar-accent/30 pl-2'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
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
      </SidebarFooter>
    </Sidebar>
  );
}