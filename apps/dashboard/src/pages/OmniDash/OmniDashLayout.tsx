import { Outlet, Link } from 'react-router-dom';
import { AlertCircle, Activity, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAdminAccess, useOmniDashSettings } from '@/omnidash/hooks';
import { usePaidAccess } from '@/hooks/usePaidAccess';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchHealthSnapshot, updateSettings } from '@/omnidash/api';
import { OMNIDASH_FLAG, OMNIDASH_SAFE_ENABLE_NOTE, OMNIDASH_NAV_ITEMS } from '@/omnidash/types';
import { OmniDashNavIconButton } from '@/components/OmniDashNavIconButton';
import { DemoModeBanner } from '@/components/demo/DemoModeBanner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useOmniDashKeyboardShortcuts } from '@/omnidash/useOmniDashKeyboardShortcuts';

export const OmniDashLayout = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, featureEnabled } = useAdminAccess();
  const { isPaid, loading: paidLoading } = usePaidAccess();
  const settings = useOmniDashSettings();

  // Enable keyboard shortcuts (H, P, K, O, I, E, N, R, A)
  useOmniDashKeyboardShortcuts();

  // Determine access: Admin OR Paid user
  const hasAccess = isAdmin || isPaid;
  const loading = adminLoading || paidLoading;

  const health = useQuery({
    queryKey: ['omnidash-health', user?.id],
    enabled: !!user && featureEnabled && hasAccess,
    queryFn: async () => {
      if (!user) throw new Error('User missing');
      return fetchHealthSnapshot(user.id);
    },
    refetchInterval: 60_000,
  });

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

  if (loading || settings.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Upgrade to access OmniDash</CardTitle>
            <CardDescription>
              OmniDash is your command center for managing operations, pipeline, KPIs, and real-time insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Included in all paid plans:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Real-time operational dashboard</li>
                <li>Sales pipeline management</li>
                <li>KPI scoreboard with daily tracking</li>
                <li>Incident monitoring and resolution</li>
                <li>Integration health monitoring</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/pricing">View Plans</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Return to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleSetting = async (key: 'demo_mode' | 'show_connected_ecosystem' | 'anonymize_kpis' | 'freeze_mode', value: boolean) => {
    if (!user) return;
    await updateSettings(user.id, { [key]: value });
    await settings.refetch();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DemoModeBanner />
      {/* Header */}
      <header className="h-16 border-b bg-background flex items-center px-4 md:px-6">
        <div className="flex items-center justify-between w-full max-w-full">
          {/* Left: Brand */}
          <div className="min-w-0 flex-shrink">
            <h1 className="text-xl font-bold truncate">APEX OmniHub</h1>
          </div>
          {/* Center: Icon Strip */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {OMNIDASH_NAV_ITEMS.map((item) => (
              <OmniDashNavIconButton
                key={item.key}
                to={item.to}
                label={item.label}
                icon={item.icon}
                shortcut={item.shortcut}
              />
            ))}
          </div>
          {/* Right: Controls */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {health.data?.lastUpdated && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Last updated: {new Date(health.data.lastUpdated).toLocaleString()}</span>
              </div>
            )}
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <span className="text-sm hidden sm:inline">Demo</span>
              <Switch
                checked={settings.data?.demo_mode}
                onCheckedChange={(v) => toggleSetting('demo_mode', v)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t flex items-center justify-around py-2 px-2 safe-bottom">
        {OMNIDASH_NAV_ITEMS.map((item) => (
          <OmniDashNavIconButton
            key={item.key}
            to={item.to}
            label={item.label}
            icon={item.icon}
            shortcut={item.shortcut}
          />
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <Outlet />
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Demo Toggles</CardTitle>
                <CardDescription>Controls for redaction and demo stories.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  { key: 'demo_mode', label: 'Demo Mode', desc: 'Redacts client names, PII, and buckets $ values.' },
                  { key: 'show_connected_ecosystem', label: 'Show Connected Ecosystem', desc: 'Stub card for ecosystem view (no hub build required).' },
                  { key: 'anonymize_kpis', label: 'Anonymize KPIs', desc: 'Buckets KPI values while in demo mode.' },
                  { key: 'freeze_mode', label: 'Freeze switch', desc: 'When ON, limit work to bugfix + onboarding only.' },
                ] as const).map((toggle, idx) => (
                  <div key={toggle.key}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{toggle.label}</p>
                        <p className="text-sm text-muted-foreground">{toggle.desc}</p>
                      </div>
                      <Switch
                        checked={settings.data?.[toggle.key]}
                        onCheckedChange={(v) => toggleSetting(toggle.key, v)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Connected Ecosystem</CardTitle>
                  <CardDescription>Stubbed for demo storytelling.</CardDescription>
                </div>
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                This card intentionally stubs the connected ecosystem view to keep the hub secure while enabling demo narratives.
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OmniDashLayout;
