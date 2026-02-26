import { useState, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ShieldCheck,
  Loader2,
  Sparkles,
  Search,
  Shield,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Zap,
  Heart,
  ClipboardCheck,
  Link2,
  Workflow,
  GitBranch,
  FolderOpen,
  CreditCard,
  Settings,
  Activity,
  Mic,
  Scan,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAdminAccess, useOmniDashSettings } from '@/omnidash/hooks';
import { usePaidAccess } from '@/hooks/usePaidAccess';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchHealthSnapshot, updateSettings } from '@/omnidash/api';
import { OMNIDASH_FLAG, OMNIDASH_SAFE_ENABLE_NOTE } from '@/omnidash/types';
import { DemoModeBanner } from '@/components/demo/DemoModeBanner';
import { useOmniDashKeyboardShortcuts } from '@/omnidash/useOmniDashKeyboardShortcuts';
import apexLogo from '@/assets/apex_emblem_logo.svg';
import './omnidash-layout.css';

const SIDEBAR_NAV = [
  { key: 'omniboard', label: 'OmniBoard', icon: LayoutDashboard, to: '/omnidash' },
  { key: 'omniskills', label: 'OmniSkills', icon: Zap, to: '/omnidash/tasks' },
  { key: 'physiomni', label: 'PhysiOmni', icon: Heart, to: '/omnidash/runs' },
  { key: 'audits', label: 'Audits', icon: ClipboardCheck, to: '/omnidash/approvals' },
  { key: 'links', label: 'Links', icon: Link2, to: '/omnidash/integrations' },
  { key: 'automations', label: 'Automations', icon: Workflow, to: '/omnidash/pipeline' },
  { key: 'workflows', label: 'Workflows', icon: GitBranch, to: '/omnidash/workflows' },
  { key: 'files', label: 'Files', icon: FolderOpen, to: '/omnidash/events' },
  { key: 'billing', label: 'Billing', icon: CreditCard, to: '/omnidash/kpis' },
  { key: 'settings', label: 'Settings', icon: Settings, to: '/omnidash/ops' },
] as const;

const TRACE_FEED = [
  { color: '#34d399', text: 'Salesforce sync completed — 48 records' },
  { color: '#38bdf8', text: 'Invoice batch #1042 processed' },
  { color: '#f97316', text: 'Workflow "Lead Nurture" triggered' },
  { color: '#a78bfa', text: 'QuickBooks reconciliation done' },
  { color: '#34d399', text: 'Ticket #7291 auto-resolved by agent' },
];

export const OmniDashLayout = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, featureEnabled } = useAdminAccess();
  const { isPaid, loading: paidLoading } = usePaidAccess();
  const settings = useOmniDashSettings();
  const location = useLocation();

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const openPanel = (panel: string | null) => {
    if (panel !== activePanel) setActivePanel(panel);
  };

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

  const initials = useMemo(() => {
    if (!user?.email) return 'U';
    return user.email[0].toUpperCase();
  }, [user?.email]);

  /* ─── Gate: Feature flag ─── */
  if (!OMNIDASH_FLAG) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#0a0e1a]">
        <AlertCircle className="h-8 w-8 text-yellow-500" />
        <p className="text-slate-400 text-sm">OmniDash is disabled. Set OMNIDASH_ENABLED=1 to enable.</p>
        <p className="text-xs text-slate-500 max-w-md text-center">{OMNIDASH_SAFE_ENABLE_NOTE}</p>
      </div>
    );
  }

  /* ─── Gate: Loading ─── */
  if (loading || settings.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-2 bg-[#0a0e1a]">
        <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
        <span className="text-slate-400">Loading dashboard...</span>
      </div>
    );
  }

  /* ─── Gate: Auth ─── */
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#0a0e1a]">
        <ShieldCheck className="h-8 w-8 text-slate-500" />
        <div className="text-center">
          <h2 className="font-semibold text-white">Sign in to access OmniDash</h2>
          <p className="text-sm text-slate-400">Authenticate to access the live command center or demo mode.</p>
        </div>
        <Button asChild><Link to="/login">Sign In</Link></Button>
      </div>
    );
  }

  /* ─── Gate: Paid/Admin ─── */
  if (!hasFullAccess) {
    return (
      <div className="container max-w-4xl mx-auto py-10 space-y-6 bg-[#0a0e1a] min-h-screen">
        <DemoModeBanner />
        <div className="text-center space-y-2">
          <Sparkles className="h-8 w-8 mx-auto text-slate-500" />
          <h2 className="text-xl font-semibold text-white">OmniDash Demo Mode</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You're in guided demo mode. Explore live-style metrics and workflows, then upgrade to unlock execution.
          </p>
          <div className="flex gap-2 justify-center">
            <Button>Unlock Full OmniDash</Button>
            <Button variant="outline" asChild><Link to="/dashboard">Open Standard Dashboard</Link></Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-300">Conversion Opportunities</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-white">24</div><p className="text-xs text-slate-500">Potential automations identified.</p></CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-300">Time Saved / Week</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-white">11.8h</div><p className="text-xs text-slate-500">With tri-force orchestration.</p></CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-300">Revenue Lift</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-white">+18%</div><p className="text-xs text-slate-500">After KPI + Pipeline activation.</p></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const toggleSetting = async (
    key: 'demo_mode' | 'show_connected_ecosystem' | 'anonymize_kpis' | 'freeze_mode',
    value: boolean,
  ) => {
    await updateSettings(user.id, { [key]: value });
    await settings.refetch();
  };

  const activeNav = SIDEBAR_NAV.find(
    (n) => n.to === location.pathname || (n.to === '/omnidash' && location.pathname === '/omnidash'),
  )?.key ?? 'omniboard';

  /* ═══════════════════════════════════════════════
   *  MAIN LAYOUT: 3-Column CSS Grid Shell
   * ═══════════════════════════════════════════════ */
  return (
    <div className="omnidash-shell">
      {/* ────── LEFT SIDEBAR (260px) ────── */}
      <aside className="od-sidebar">
        <div className="od-sidebar-logo">
          <img src={apexLogo} alt="APEX" />
          <span>APEX OmniHub</span>
        </div>

        <nav className="od-nav">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`od-nav-item${activeNav === item.key ? ' active' : ''}`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="od-sidebar-footer">
          <div className="od-sentry-status">
            <span className="od-sentry-dot" />
            All Systems Operational
          </div>
          APEX Business Systems Ltd. &middot; OmniDash Platform
        </div>
      </aside>

      {/* ────── CENTER COLUMN ────── */}
      <div className="od-center">
        {/* Header */}
        <header className="od-header" data-testid="omnidash-top-header">
          <div className="od-header-brand">
            <LayoutDashboard className="h-4 w-4" style={{ color: '#38bdf8' }} />
            <span style={{ color: '#e2e8f0' }}>APEX OmniDash</span>
          </div>

          <div className="od-header-search">
            <Search />
            <input
              type="search"
              placeholder="Search workflows, connectors, traces..."
              data-testid="global-search-input"
            />
          </div>

          <div className="od-header-actions">
            <div className="od-org-badge">
              APEX Business Systems
              <ChevronDown className="h-3 w-3" />
            </div>

            <div className="od-sentry-badge">
              <Shield className="h-3 w-3" />
              Zero Trust Active
            </div>

            <Link to="/apex" className="od-connect-ai">Connect AI</Link>

            <button type="button" className="od-avatar" aria-label="Notifications" style={{ position: 'relative' }}>
              <Bell className="h-3.5 w-3.5" />
            </button>

            <div className="od-avatar" title={user.email ?? 'User'}>
              {initials}
            </div>
          </div>
        </header>

        {/* Routed Content */}
        <div className="od-content">
          <Outlet />
        </div>
      </div>

      {/* ────── RIGHT SIDEBAR (320px) ────── */}
      <aside className="od-right">
        {/* Card 1: Ops Controls */}
        <div className="glass">
          <div className="od-card-title">Ops Controls</div>
          <div className="od-toggle-row">
            <span>Demo Mode</span>
            <Switch
              checked={settings.data?.demo_mode}
              onCheckedChange={(v) => toggleSetting('demo_mode', v)}
            />
          </div>
          <div className="od-toggle-row">
            <span>Connected Ecosystem</span>
            <Switch
              checked={settings.data?.show_connected_ecosystem}
              onCheckedChange={(v) => toggleSetting('show_connected_ecosystem', v)}
            />
          </div>
          <div className="od-toggle-row">
            <span>Anonymize KPIs</span>
            <Switch
              checked={settings.data?.anonymize_kpis}
              onCheckedChange={(v) => toggleSetting('anonymize_kpis', v)}
            />
          </div>
          <div className="od-toggle-row">
            <span>Freeze Mode</span>
            <Switch
              checked={settings.data?.freeze_mode}
              onCheckedChange={(v) => toggleSetting('freeze_mode', v)}
            />
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
            Running 24 tasks &middot; 96.8% success
          </div>
        </div>

        {/* Card 2: OmniTrace */}
        <div className="glass">
          <div className="od-card-title">OmniTrace</div>
          {TRACE_FEED.map((item, i) => (
            <div key={i} className="od-trace-item">
              <span className="od-trace-dot" style={{ background: item.color }} />
              {item.text}
            </div>
          ))}
          <button type="button" className="od-scan-btn" style={{ marginTop: 10 }}>
            <Activity className="h-3 w-3" />
            Replay Workflows
          </button>
        </div>

        {/* Card 3: Analytics */}
        <div className="glass">
          <div className="od-card-title">Analytics</div>
          <div className="od-metric-grid">
            <div className="od-metric-cube">
              <div className="od-metric-value" style={{ color: '#e2e8f0' }}>27 / 50</div>
              <div className="od-metric-label">Tasks Today</div>
            </div>
            <div className="od-metric-cube">
              <div className="od-metric-value" style={{ color: '#34d399' }}>96.8%</div>
              <div className="od-metric-label">Success Rate</div>
            </div>
            <div className="od-metric-cube">
              <div className="od-metric-value" style={{ color: '#38bdf8' }}>842ms</div>
              <div className="od-metric-label">Avg. Latency</div>
            </div>
            <div className="od-metric-cube">
              <div className="od-metric-value" style={{ color: '#4ade80' }}>$3,240</div>
              <div className="od-metric-label">Cost Saved</div>
            </div>
          </div>
        </div>

        {/* Card 4: Security Audit */}
        <div className="glass">
          <div className="od-card-title">Security Audit</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Shield className="h-5 w-5" style={{ color: '#34d399' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Zero Trust Active</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>All gateways secured</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
            Last scan: 12 min ago
          </div>
          <button type="button" className="od-scan-btn">
            <Scan className="h-3 w-3" />
            Scan Now
          </button>
        </div>
      </aside>
    </div>
  );
};

export default OmniDashLayout;
