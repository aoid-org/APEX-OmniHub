/**
 * OmniDashLayout — Main App Stub
 *
 * Canonical implementation: apps/omnihub-site/src/layouts/OmniDashLayout.tsx
 * This stub exists for the main app's lazy(import()) at src/App.tsx:24.
 * It renders the 3-column CSS grid shell with Outlet for nested routes.
 *
 * The main app's OmniDash panels (Today, Pipeline, Kpis, etc.) render
 * inside the center column's Outlet.
 */

import { useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
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
  Activity,
  Scan,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOmniModal } from '@/stores/omniModalStore';
import { useDemoStore } from '@/stores/demoStore';
import { Switch } from '@/components/ui/switch';
import apexLogo from '@/assets/apex_emblem_logo.svg';
import { UniversalModalEngine } from '@/components/omnidash/media/UniversalModalEngine';
import '@/styles/omnidash-layout.css';

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
  const { invoke } = useOmniModal();
  const demoStore = useDemoStore();
  const { user } = useAuth();
  const location = useLocation();

  const initials = useMemo(() => {
    if (!user?.email) return 'U';
    return user.email[0].toUpperCase();
  }, [user?.email]);

  const activeNav = SIDEBAR_NAV.find(
    (n) => n.to === location.pathname || (n.to === '/omnidash' && location.pathname === '/omnidash'),
  )?.key ?? 'omniboard';

  return (
    <div className="omnidash-shell">
      {/* LEFT SIDEBAR */}
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
                onClick={() => invoke({ id: `nav-${item.key}`, provider: 'System', type: 'oauth', title: `Load ${item.label}` })}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="od-sidebar-footer">
          <div className="od-sentry-status" style={{ cursor: 'pointer' }} onClick={() => invoke({ id: 'sys-status', provider: 'System', type: 'selection', title: 'System Health Diagnostics' })}>
            <span className="od-sentry-dot" />{' '}
            <span>All Systems Operational</span>
          </div>
          <span>{'APEX Business Systems Ltd. \u00B7 OmniDash Platform'}</span>
          <div style={{ cursor: 'pointer', marginTop: 8 }} onClick={() => invoke({ id: 'sys-logout', provider: 'System', type: 'confirmation', title: 'Terminate Session?' })}>Sign Out</div>
        </div>
      </aside>

      {/* CENTER COLUMN */}
      <div className="od-center">
        <header className="od-header" data-testid="omnidash-top-header">
          <div className="od-header-brand">
            <LayoutDashboard className="h-4 w-4" style={{ color: '#38bdf8' }} />
            <span style={{ color: '#e2e8f0' }}>APEX OmniDash</span>
          </div>
          <div className="od-header-search" onClick={() => invoke({ id: 'sys-search', provider: 'OmniSearch', type: 'form', title: 'Command Node Search' })}>
            <Search />
            <input type="search" placeholder="Search workflows, connectors, traces..." data-testid="global-search-input" />
          </div>
          <div className="od-header-actions">
            <button type="button" className="od-avatar" aria-label="Theme" onClick={() => invoke({ id: 'sys-theme', provider: 'System', type: 'selection', title: 'Theme Options' })}><Sun className="h-3.5 w-3.5" /></button>
            <div className="od-org-badge" onClick={() => invoke({ id: 'sys-org', provider: 'System', type: 'selection', title: 'Switch Workspace' })}>APEX Business Systems<ChevronDown className="h-3 w-3" /></div>
            <div className="od-sentry-badge" onClick={() => invoke({ id: 'sys-audit', provider: 'Security', type: 'confirmation', title: 'Zero Trust Log Audit' })}><Shield className="h-3 w-3" />Zero Trust Active</div>
            <Link to="/apex" className="od-connect-ai" onClick={() => invoke({ id: 'connect-ai', provider: 'APEX', type: 'selection', title: 'Select AI Model' })}>Connect AI</Link>
            <button type="button" className="od-avatar" aria-label="Notifications" onClick={() => invoke({ id: 'sys-feed', provider: 'System', type: 'selection', title: 'System Notifications' })}><Bell className="h-3.5 w-3.5" /></button>
            <div className="od-avatar" style={{ cursor: 'pointer' }} title={user?.email ?? 'User'} onClick={() => invoke({ id: 'sys-profile', provider: 'System', type: 'form', title: 'User Preferences' })}>{initials}</div>
          </div>
        </header>
        <div className="od-content"><Outlet /></div>
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="od-right">
        <div className="glass">
          <div className="od-card-title">Ops Controls</div>
          <div className="od-toggle-row"><span>Demo Mode</span><Switch checked={demoStore.demoMode} onCheckedChange={(v) => demoStore.setDemoMode(v)} /></div>
          <div className="od-toggle-row"><span>Connected Ecosystem</span><Switch checked={demoStore.showConnectedEcosystem} onCheckedChange={(v) => demoStore.setShowConnectedEcosystem(v)} /></div>
          <div className="od-toggle-row"><span>Anonymize KPIs</span><Switch checked={demoStore.anonymizeKpis} onCheckedChange={(v) => demoStore.setAnonymizeKpis(v)} /></div>
          <div className="od-toggle-row"><span>Freeze Mode</span><Switch checked={demoStore.freezeMode} onCheckedChange={(v) => demoStore.setFreezeMode(v)} /></div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#64748b', textAlign: 'center' }}>Running 24 tasks &middot; 96.8% success</div>
        </div>
        <div className="glass">
          <div className="od-card-title">OmniTrace</div>
          {TRACE_FEED.map((item) => (<div key={item.text} className="od-trace-item" style={{ cursor: 'pointer' }} onClick={() => invoke({ id: 'trace-detail', provider: 'OmniTrace', type: 'form', title: 'Trace Execution Log' })}><span className="od-trace-dot" style={{ background: item.color }} />{item.text}</div>))}
          <button type="button" className="od-scan-btn" style={{ marginTop: 10 }} onClick={() => invoke({ id: 'sys-replay', provider: 'OmniTrace', type: 'selection', title: 'Select Replay Workflow' })}><Activity className="h-3 w-3" />Replay Workflows</button>
        </div>
        <div className="glass">
          <div className="od-card-title">Analytics</div>
          <div className="od-metric-grid">
            <div className="od-metric-cube" style={{ cursor: 'pointer' }} onClick={() => invoke({ id: 'kpi-drill', provider: 'Analytics', type: 'form', title: 'KPI Deep Dive' })}><div className="od-metric-value" style={{ color: '#e2e8f0' }}>27 / 50</div><div className="od-metric-label">Tasks Today</div></div>
            <div className="od-metric-cube" style={{ cursor: 'pointer' }} onClick={() => invoke({ id: 'kpi-drill', provider: 'Analytics', type: 'form', title: 'KPI Deep Dive' })}><div className="od-metric-value" style={{ color: '#34d399' }}>96.8%</div><div className="od-metric-label">Success Rate</div></div>
            <div className="od-metric-cube" style={{ cursor: 'pointer' }} onClick={() => invoke({ id: 'kpi-drill', provider: 'Analytics', type: 'form', title: 'KPI Deep Dive' })}><div className="od-metric-value" style={{ color: '#38bdf8' }}>842ms</div><div className="od-metric-label">Avg. Latency</div></div>
            <div className="od-metric-cube" style={{ cursor: 'pointer' }} onClick={() => invoke({ id: 'kpi-drill', provider: 'Analytics', type: 'form', title: 'KPI Deep Dive' })}><div className="od-metric-value" style={{ color: '#4ade80' }}>$3,240</div><div className="od-metric-label">Cost Saved</div></div>
          </div>
        </div>
        <div className="glass" style={{ cursor: 'pointer' }} onClick={() => invoke({ id: 'sec-log', provider: 'Security', type: 'selection', title: 'Audit History' })}>
          <div className="od-card-title">Security Audit</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><ShieldCheck className="h-5 w-5" style={{ color: '#34d399' }} /><div><div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Zero Trust Active</div><div style={{ fontSize: 10, color: '#64748b' }}>All gateways secured</div></div></div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Last scan: 12 min ago</div>
          <button type="button" className="od-scan-btn" onClick={(e) => { e.stopPropagation(); invoke({ id: 'sys-scan', provider: 'Security', type: 'confirmation', title: 'Initiate Deep Scan' }); }}><Scan className="h-3 w-3" />Scan Now</button>
        </div>
      </aside>
      <UniversalModalEngine />
    </div>
  );
};

export default OmniDashLayout;
