/**
 * OmniDashLayout — SPA Command Center
 *
 * Architecture:
 * - OVERRIDE: STRICT Single Page App (CTO Mandate)
 * - Today dashboard is the PERMANENT main view (zero routing)
 * - All sub-views (telemetry, analytics, tools) open as Apple-grade Dialog modals
 * - Zero route changes within the dashboard
 * - Highly responsive, intuitive cross-platform UX
 * - Keyboard shortcuts trigger activeDialog state
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, Activity, ShieldCheck, Loader2,
  Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminAccess, useOmniDashSettings } from '@/omnidash/hooks';
import { usePaidAccess } from '@/hooks/usePaidAccess';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchHealthSnapshot, updateSettings } from '@/omnidash/api';
import { OMNIDASH_FLAG, OMNIDASH_SAFE_ENABLE_NOTE, OMNIDASH_NAV_ITEMS } from '@/omnidash/types';
import { OmniDashNavIconButton } from '@/components/OmniDashNavIconButton';
import { DemoModeBanner } from '@/components/demo/DemoModeBanner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OmniTraceFeed } from '@/components/dashboard/OmniTraceFeed';
import { OmniSkillsWidget } from '@/components/skills/OmniSkillsWidget';
import { useOmniDashKeyboardShortcuts } from '@/omnidash/useOmniDashKeyboardShortcuts';

// Sub-view lazy imports (loaded only when Sheet opens)
import { lazy, Suspense } from 'react';
const Today        = lazy(() => import('./Today'));
const Pipeline     = lazy(() => import('./Pipeline'));
const Kpis         = lazy(() => import('./Kpis'));
const Ops          = lazy(() => import('./Ops'));
const Integrations = lazy(() => import('./Integrations'));
const Events       = lazy(() => import('./Events'));
const Entities     = lazy(() => import('./Entities'));
const Runs         = lazy(() => import('./Runs'));
const Tasks        = lazy(() => import('./Tasks'));
const Approvals    = lazy(() => import('./Approvals'));
const WorkflowStudio = lazy(() => import('./WorkflowStudio'));
const LocalAgents  = lazy(() => import('./LocalAgents'));

type PanelKey =
  | 'pipeline' | 'kpis' | 'ops' | 'integrations'
  | 'events' | 'entities' | 'runs' | 'tasks'
  | 'approvals' | 'workflows' | 'local-agents'
  | null;

const PANEL_LABELS: Record<Exclude<PanelKey, null>, string> = {
  pipeline: 'Pipeline',
  kpis: 'KPIs',
  ops: 'Ops Console',
  integrations: 'Integrations',
  events: 'Events',
  entities: 'Entities',
  runs: 'Runs',
  tasks: 'Tasks',
  approvals: 'Approvals',
  workflows: 'Workflow Studio',
  'local-agents': 'Local Agents',
};

const PanelFallback = () => (
  <div className="flex items-center justify-center h-48">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export const OmniDashLayout = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, featureEnabled } = useAdminAccess();
  const { isPaid, loading: paidLoading } = usePaidAccess();
  const settings = useOmniDashSettings();

  // Active Dialog panel state — null = no dialog open
  const [activePanel, setActivePanel] = useState<PanelKey>(null);

  const openPanel = useCallback((key: PanelKey) => setActivePanel(key), []);
  const closePanel = useCallback(() => setActivePanel(null), []);

  // Keyboard shortcuts: H=Today P=Pipeline K=KPIs O=Ops I=Integrations etc.
  useOmniDashKeyboardShortcuts(openPanel);

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

  // ── Feature flag guard ────────────────────────────────────────────────────
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

  // ── Loading state ─────────────────────────────────────────────────────────
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

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Sign in to access OmniDash</CardTitle>
            <CardDescription>
              Authenticate to access the live command center or demo mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Access guard (demo mode for free users) ───────────────────────────────
  if (!hasFullAccess) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> OmniDash Demo Mode
            </CardTitle>
            <CardDescription>
              You&apos;re in guided demo mode. Explore live-style metrics and workflows, then upgrade to unlock execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/pricing">Unlock Full OmniDash</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">Open Standard Dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Conversion Opportunities</CardDescription>
              <CardTitle className="text-2xl">24</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Potential automations identified from your current usage patterns.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Time Saved / Week</CardDescription>
              <CardTitle className="text-2xl">11.8h</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Projected with tri-force workflow orchestration enabled.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Revenue Lift Potential</CardDescription>
              <CardTitle className="text-2xl">+18%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Modeled from similar teams after activating KPI + Pipeline modules.
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Demo Pipeline Snapshot
              </CardTitle>
              <CardDescription>Read-only sample based on production patterns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Discovery</span><span className="font-medium">9 deals</span></div>
              <div className="flex justify-between"><span>Proposal</span><span className="font-medium">6 deals</span></div>
              <div className="flex justify-between"><span>Negotiation</span><span className="font-medium">4 deals</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Next Unlocks
              </CardTitle>
              <CardDescription>Upgrade to activate write actions and integrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• One-click workflow execution</p>
              <p>• Real-time incident console + alerts</p>
              <p>• Bi-directional CRM + ERP sync</p>
              <p>• KPI anomaly detection with AI recommendations</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Settings toggle helper ────────────────────────────────────────────────
  const toggleSetting = async (
    key: 'demo_mode' | 'show_connected_ecosystem' | 'anonymize_kpis' | 'freeze_mode',
    value: boolean
  ) => {
    await updateSettings(user.id, { [key]: value });
    await settings.refetch();
  };

  // ── Resolve which component to render inside the Sheet ───────────────────
  const renderPanelContent = () => {
    switch (activePanel) {
      case 'pipeline':     return <Pipeline />;
      case 'kpis':         return <Kpis />;
      case 'ops':          return <Ops />;
      case 'integrations': return <Integrations />;
      case 'events':       return <Events />;
      case 'entities':     return <Entities />;
      case 'runs':         return <Runs />;
      case 'tasks':        return <Tasks />;
      case 'approvals':    return <Approvals />;
      case 'workflows':    return <WorkflowStudio />;
      case 'local-agents': return <LocalAgents />;
      default:             return null;
    }
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <DemoModeBanner />

      {/* Header */}
      <header className="h-16 glass-card border-b-2 border-b-accent/30 flex items-center px-6 md:px-8">
        <div className="flex items-center justify-between w-full max-w-full">
          <div className="min-w-0 flex-shrink flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <h1 className="text-lg font-semibold tracking-tight truncate">APEX OmniHub</h1>
          </div>

          {/* Desktop nav — horizontally scrollable on small screens */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-shrink-0 max-w-[50vw]">
            {OMNIDASH_NAV_ITEMS.map((item) => {
              const panelKey = item.key as PanelKey;
              return (
                <OmniDashNavIconButton
                  key={item.key}
                  onClick={() => openPanel(panelKey)}
                  label={item.label}
                  icon={item.icon}
                  shortcut={item.shortcut}
                  isActive={activePanel === panelKey}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <OmniSkillsWidget />
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

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t flex items-center justify-around py-2 px-2 safe-bottom">
        {OMNIDASH_NAV_ITEMS.map((item) => {
          const panelKey = item.key as PanelKey;
          return (
            <OmniDashNavIconButton
              key={item.key}
              onClick={() => openPanel(panelKey)}
              label={item.label}
              icon={item.icon}
              shortcut={item.shortcut}
              isActive={activePanel === panelKey}
            />
          );
        })}
      </div>

      {/* Main content — Today is always visible */}
      <main className="flex-1 p-6 md:p-8 pb-20 md:pb-8 bg-background/50">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Suspense fallback={<PanelFallback />}>
              <Today />
            </Suspense>
          </div>
          <div className="space-y-6">
            <Card className="glass-card hover-lift animate-in-delay-1 rounded-2xl">
              <CardHeader>
                <CardTitle>Sales Demo Toggles</CardTitle>
                <CardDescription>Controls for redaction and demo stories.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Demo Mode</p>
                    <p className="text-sm text-muted-foreground">Redacts client names, PII, and buckets $ values.</p>
                  </div>
                  <Switch checked={settings.data?.demo_mode} onCheckedChange={(v) => toggleSetting('demo_mode', v)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Connected Ecosystem</p>
                    <p className="text-sm text-muted-foreground">Stub card for ecosystem view (no hub build required).</p>
                  </div>
                  <Switch checked={settings.data?.show_connected_ecosystem} onCheckedChange={(v) => toggleSetting('show_connected_ecosystem', v)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Anonymize KPIs</p>
                    <p className="text-sm text-muted-foreground">Buckets KPI values while in demo mode.</p>
                  </div>
                  <Switch checked={settings.data?.anonymize_kpis} onCheckedChange={(v) => toggleSetting('anonymize_kpis', v)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Freeze switch</p>
                    <p className="text-sm text-muted-foreground">When ON, limit work to bugfix + onboarding only.</p>
                  </div>
                  <Switch checked={settings.data?.freeze_mode} onCheckedChange={(v) => toggleSetting('freeze_mode', v)} />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift animate-in-delay-2 rounded-2xl">
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

            <OmniTraceFeed maxItems={10} />
          </div>
        </div>
      </main>

      </main>

      {/* Strict SPA Overlay — Apple-grade Framer Motion Dialog */}
      <AnimatePresence>
        {activePanel !== null && (
          <Dialog open={true} onOpenChange={(open) => { if (!open) closePanel(); }}>
            <DialogContent
              className="w-[95vw] md:w-[85vw] lg:w-[75vw] xl:max-w-5xl max-h-[90vh] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden glass-card shadow-2xl border border-white/10"
              style={{ zIndex: 100 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="flex flex-col h-full max-h-[90vh]"
              >
                <DialogHeader className="px-6 py-4 border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
                  <DialogTitle className="text-left text-lg font-semibold tracking-tight">
                    {activePanel ? PANEL_LABELS[activePanel] : ''}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-background/40">
                  <Suspense fallback={<PanelFallback />}>
                    {renderPanelContent()}
                  </Suspense>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OmniDashLayout;
