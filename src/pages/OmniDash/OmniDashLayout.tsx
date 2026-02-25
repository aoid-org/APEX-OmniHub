import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AlertCircle, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
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

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const openPanel = (panel: string | null) => {
    if (panel === activePanel) {
      return;
    }
    setActivePanel(panel);
  };

  // Enable keyboard shortcuts (H, P, K, O, I, E, N, R, A, W)
  useOmniDashKeyboardShortcuts(openPanel);

  // Determine full access: Admin OR Paid user
  const hasFullAccess = isAdmin || isPaid;
  const loading = adminLoading || paidLoading;

  const health = useQuery({
    queryKey: ['omnidash-health', user?.id],
    enabled: !!user && featureEnabled && hasFullAccess,
    queryFn: async () => {
      if (!user) throw new Error('User missing');
      return fetchHealthSnapshot(user.id);
    },
    refetchInterval: 60_000,
  });

  if (!OMNIDASH_FLAG) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-8 w-8 text-yellow-500" />
        <p className="text-muted-foreground text-sm">
          OmniDash is disabled. Set OMNIDASH_ENABLED=1 to enable.
        </p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{OMNIDASH_SAFE_ENABLE_NOTE}</p>
      </div>
    );
  }

  if (loading || settings.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <h2 className="font-semibold">Sign in to access OmniDash</h2>
          <p className="text-sm text-muted-foreground">
            Authenticate to access the live command center or demo mode.
          </p>
        </div>
        <Button asChild><Link to="/login">Sign In</Link></Button>
      </div>
    );
  }

  if (!hasFullAccess) {
    return (
      <div className="container max-w-4xl mx-auto py-10 space-y-6">
        <DemoModeBanner />
        <div className="text-center space-y-2">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">OmniDash Demo Mode</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You're in guided demo mode. Explore live-style metrics and workflows,
            then upgrade to unlock execution.
          </p>
          <div className="flex gap-2 justify-center">
            <Button>Unlock Full OmniDash</Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">Open Standard Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversion Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                Potential automations identified from your current usage patterns.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time Saved / Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">11.8h</div>
              <p className="text-xs text-muted-foreground">
                Projected with tri-force workflow orchestration enabled.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue Lift Potential</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+18%</div>
              <p className="text-xs text-muted-foreground">
                Modeled from similar teams after activating KPI + Pipeline modules.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Demo Pipeline Snapshot</CardTitle>
            <CardDescription>Read-only sample based on production patterns.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[['Discovery', 9], ['Proposal', 6], ['Negotiation', 4]].map(([stage, count]) => (
                <div key={stage as string} className="min-w-[120px] p-3 rounded-lg border bg-muted/30">
                  <div className="text-xs font-medium text-muted-foreground">{stage}</div>
                  <div className="text-lg font-bold">{count} deals</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Next Unlocks</h3>
          <p className="text-xs text-muted-foreground">Upgrade to activate write actions and integrations.</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• One-click workflow execution</li>
            <li>• Real-time incident console + alerts</li>
            <li>• Bi-directional CRM + ERP sync</li>
            <li>• KPI anomaly detection with AI recommendations</li>
          </ul>
        </div>
      </div>
    );
  }

  const toggleSetting = async (
    key: 'demo_mode' | 'show_connected_ecosystem' | 'anonymize_kpis' | 'freeze_mode',
    value: boolean
  ) => {
    await updateSettings(user.id, { [key]: value });
    await settings.refetch();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 border-r flex flex-col items-center py-4 gap-3 bg-background">
        <div className="text-xs font-bold tracking-tight mb-2">APEX</div>
        {OMNIDASH_NAV_ITEMS.map((item) => (
          <OmniDashNavIconButton
            key={item.key}
            item={item}
            isActive={activePanel === item.key}
            onClick={() => openPanel(item.key === 'home' ? null : item.key)}
          />
        ))}
        <div className="mt-auto flex flex-col gap-2 items-center">
          {health.data?.lastUpdated && (
            <div className="text-[9px] text-muted-foreground text-center px-1">
              Last updated: {new Date(health.data.lastUpdated).toLocaleString()}
            </div>
          )}
          <ThemeToggle />
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            Demo <Switch checked={settings.data?.demo_mode} onCheckedChange={(v) => toggleSetting('demo_mode', v)} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Sheet panels */}
      {OMNIDASH_NAV_ITEMS.map((item) => (
        <OmniDashNavIconButton
          key={item.key}
          item={item}
          isActive={activePanel === item.key}
          onClick={() => openPanel(item.key === 'home' ? null : item.key)}
          asSheet
          onClose={() => setActivePanel(null)}
        />
      ))}

      {/* Settings side panel */}
      {activePanel === 'settings' && (
        <aside className="w-72 border-l p-4 overflow-y-auto bg-background space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sales Demo Toggles</CardTitle>
              <CardDescription>Controls for redaction and demo stories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Demo Mode</div>
                  <div className="text-xs text-muted-foreground">Redacts client names, PII, and buckets $ values.</div>
                </div>
                <Switch checked={settings.data?.demo_mode} onCheckedChange={(v) => toggleSetting('demo_mode', v)} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Show Connected Ecosystem</div>
                  <div className="text-xs text-muted-foreground">Stub card for ecosystem view (no hub build required).</div>
                </div>
                <Switch checked={settings.data?.show_connected_ecosystem} onCheckedChange={(v) => toggleSetting('show_connected_ecosystem', v)} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Anonymize KPIs</div>
                  <div className="text-xs text-muted-foreground">Buckets KPI values while in demo mode.</div>
                </div>
                <Switch checked={settings.data?.anonymize_kpis} onCheckedChange={(v) => toggleSetting('anonymize_kpis', v)} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Freeze switch</div>
                  <div className="text-xs text-muted-foreground">When ON, limit work to bugfix + onboarding only.</div>
                </div>
                <Switch checked={settings.data?.freeze_mode} onCheckedChange={(v) => toggleSetting('freeze_mode', v)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Connected Ecosystem</CardTitle>
              <CardDescription>Stubbed for demo storytelling.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                This card intentionally stubs the connected ecosystem view to keep
                the hub secure while enabling demo narratives.
              </p>
            </CardContent>
          </Card>
        </aside>
      )}
    </div>
  );
};

export default OmniDashLayout;
