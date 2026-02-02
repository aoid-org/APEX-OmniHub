/**
 * OmniDash Layout - Standalone Shell
 * 
 * Self-contained layout for OmniDash that works in both demo and live modes.
 * NO double-shell - this replaces DashboardLayout for OmniDash routes.
 * 
 * Features:
 * - Header with navigation icons
 * - Mobile bottom tab bar
 * - Tablet-responsive grid
 * - Demo mode integration via AccessContext
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { AlertCircle, Activity, LogIn, PlayCircle, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessMode } from '@/contexts/AccessContext';
import { demoStore } from '@/demo';
import { OMNIDASH_FLAG, OMNIDASH_SAFE_ENABLE_NOTE, OMNIDASH_NAV_ITEMS } from '@/omnidash/types';
import { OmniDashNavIconButton } from '@/components/OmniDashNavIconButton';

export const OmniDashLayout = () => {
  const { user } = useAuth();
  const { isDemo, isAuthenticated, modeLabel } = useAccessMode();
  const navigate = useNavigate();

  // In demo mode, we don't need admin access check
  const isAdmin = isDemo ? true : Boolean(user);
  const loading = false;
  const featureEnabled = true;

  // Health check - only in live mode
  const health = useQuery({
    queryKey: ['omnidash-health', user?.id, isDemo],
    enabled: !isDemo && !!user && featureEnabled,
    queryFn: async () => {
      // In live mode, fetch real health data
      // For now, return mock data
      return { lastUpdated: new Date().toISOString() };
    },
    refetchInterval: 60_000,
  });

  // Demo/live settings state
  const [demoModeToggle, setDemoModeToggle] = React.useState(false);
  const [showEcosystem, setShowEcosystem] = React.useState(true);
  const [anonymizeKpis, setAnonymizeKpis] = React.useState(false);
  const [freezeMode, setFreezeMode] = React.useState(false);

  if (!OMNIDASH_FLAG) {
    return (
      <div className="p-6 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>OmniDash is disabled. Set OMNIDASH_ENABLED=1 to enable. {OMNIDASH_SAFE_ENABLE_NOTE}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 w-32 bg-muted rounded" />
      </div>
    );
  }

  // Guest mode (not demo, not authenticated) - show entry gate
  if (!isDemo && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Welcome to OmniDash</CardTitle>
            <CardDescription>
              Your business intelligence command center
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
              size="lg"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Log In for Live Data
            </Button>
            <Button 
              onClick={() => {
                globalThis.localStorage.setItem('apex.demo.enabled', 'true');
                globalThis.location.reload();
              }}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Explore Demo Mode
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="ghost"
              className="w-full"
              size="sm"
            >
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex items-center px-4 md:px-6">
        <div className="flex items-center justify-between w-full max-w-full">
          {/* Left: Brand + Mode Badge */}
          <div className="min-w-0 flex items-center gap-3">
            <h1 className="text-xl font-bold truncate">OmniDash</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              modeLabel === 'demo' 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {modeLabel === 'demo' ? 'DEMO' : 'LIVE'}
            </span>
          </div>
          
          {/* Center: Icon Strip (hidden on mobile, shown on tablet+) */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {OMNIDASH_NAV_ITEMS.map((item) => (
              <OmniDashNavIconButton
                key={item.key}
                to={item.to}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </div>
          
          {/* Right: Controls */}
          <div className="flex items-center gap-4">
            {/* Last updated (desktop only) */}
            {!isDemo && health.data?.lastUpdated && (
              <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Updated: {new Date(health.data.lastUpdated).toLocaleTimeString()}</span>
              </div>
            )}
            
            {/* Auth button for demo mode */}
            {isDemo && (
              <Button
                onClick={() => navigate('/auth')}
                size="sm"
                variant="outline"
                className="hidden sm:flex"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t flex items-center justify-around py-2 px-2 z-50 safe-bottom"
        role="navigation"
        aria-label="OmniDash navigation"
      >
        {OMNIDASH_NAV_ITEMS.map((item) => (
          <OmniDashNavIconButton
            key={item.key}
            to={item.to}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        {/* Responsive grid: 1 col mobile, 2 col tablet, 2:1 ratio desktop */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-[2fr,1fr]">
          {/* Main content area */}
          <div className="space-y-4 md:space-y-6 order-1">
            <Outlet />
          </div>
          
          {/* Sidebar area */}
          <div className="space-y-4 md:space-y-6 order-2 md:order-2">
            {/* Demo Controls Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Display Settings</CardTitle>
                <CardDescription className="text-sm">
                  {isDemo ? 'Demo mode - changes are local only' : 'Configure your dashboard'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Anonymize Data</p>
                    <p className="text-xs text-muted-foreground truncate">Redact sensitive values</p>
                  </div>
                  <Switch
                    checked={anonymizeKpis}
                    onCheckedChange={setAnonymizeKpis}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Show Ecosystem</p>
                    <p className="text-xs text-muted-foreground truncate">Display connected services</p>
                  </div>
                  <Switch
                    checked={showEcosystem}
                    onCheckedChange={setShowEcosystem}
                  />
                </div>
                {!isDemo && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">Freeze Mode</p>
                        <p className="text-xs text-muted-foreground truncate">Limit to bugfix only</p>
                      </div>
                      <Switch
                        checked={freezeMode}
                        onCheckedChange={setFreezeMode}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Connected Ecosystem Card */}
            {showEcosystem && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Connected Services</CardTitle>
                  <CardDescription className="text-sm">
                    {isDemo ? 'Simulated integrations' : 'Your active integrations'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {demoStore.getIntegrations().slice(0, 3).map((integration) => (
                      <div 
                        key={integration.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{integration.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          integration.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : 'bg-zinc-500/10 text-zinc-500'
                        }`}>
                          {integration.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Need React import for useState
import React from 'react';

export default OmniDashLayout;
