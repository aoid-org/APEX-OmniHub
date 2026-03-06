/**
 * APEX OmniDash Layout — v6.1.0 Spatial 2D Canvas Shell
 * @version 6.1.0 — OS-level spatial workspace with GPU-composited widgets
 *
 * 2-column layout: 260px sidebar | flex-1 canvas host
 * Custom APEX-branded 3D nav icons
 * Theme-aware via data-theme attribute
 *
 * ARCHITECTURE MANDATE (Layer 1: The Shell):
 * The Shell is the Locked Perimeter. It owns the static sidebar and header.
 * RULE: The Shell must NEVER be wrapped by physics or drag contexts.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useState, useCallback, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOmniTheme } from '@/hooks/useOmniTheme';
import { Search, Bell, Shield, ChevronDown, Scan, Sun, Moon, X, ChevronRight, Menu, LayoutGrid, Zap, Settings } from 'lucide-react';
import { DashboardOverview } from '@/pages/DashboardOverview';
import { OmniSpatialHost } from '@/components/omnidash/OmniSpatialHost';
import { useOmniModal } from '../../../../src/stores/omniModalStore';
import '@/styles/omnidash-layout.css';
import { useOmniTrace } from '@/hooks/useOmniTrace';
import { useSystemHealth } from '@/hooks/useHealthStatus';
import { OmniCanvas } from '@/components/omnidash/OmniCanvas';
import { WidgetShell } from '@/components/omnidash/WidgetShell';
import { FloatingWindowRenderer } from '@/components/omnidash/FloatingWindow';
import { useOmniDashStore, WIDGET_IDS } from '@/stores/omniDashStore';

// Custom nav icons
import navOmniboard from '@/assets/nav/omniboard_icon.png';
import navOmniskills from '@/assets/nav/omniskills_icon.png';
import navPhysiomni from '@/assets/nav/physiomni_icon.png';
import navAudits from '@/assets/nav/audits_icon.png';
import navLinks from '@/assets/nav/links_icon.png';
import navAutomations from '@/assets/nav/automations_icon.png';
import navWorkflows from '@/assets/nav/workflows_icon.png';
import navFiles from '@/assets/nav/files_icon.png';
import navBilling from '@/assets/nav/billing_icon.png';
import navSettings from '@/assets/nav/settings_icon.png';
import apexWordmark from '@/assets/apex_omnihub_wordmark.png';
import { APP_REGISTRY, type AppRegistryEntry } from '../../../../packages/core/src/registry';

// ────────────────────────────────────────────────
// Sidebar Navigation Map - custom icon images
// ────────────────────────────────────────────────
const NAV_ICON_MAP: Readonly<Record<string, string>> = {
  omniboard: navOmniboard,
  omniport: navLinks,
  maestro: navAutomations,
  fortress: navAudits,
  orchestrator: navWorkflows,
  omniskills: navOmniskills,
  physiomni: navPhysiomni,
  audits: navAudits,
  links: navLinks,
  automations: navAutomations,
  workflows: navWorkflows,
  files: navFiles,
  billing: navBilling,
  settings: navSettings,
};

const SIDEBAR_NAV = APP_REGISTRY
  .filter((entry: AppRegistryEntry) => !['omniport', 'maestro', 'fortress', 'orchestrator'].includes(entry.key))
  .map((entry: AppRegistryEntry) => ({
    key: entry.key,
    label: entry.label,
    icon: NAV_ICON_MAP[entry.iconAssetKey] ?? navOmniboard,
    to: entry.routePath,
  }));

const TRACE_FEED = [
  { color: '#34d399', text: 'Salesforce sync completed - 48 records' },
  { color: '#f97316', text: 'Invoice batch #1042 processed' },
  { color: '#f97316', text: 'Workflow "Lead Nurture" triggered' },
  { color: '#a78bfa', text: 'QuickBooks reconciliation done' },
  { color: '#34d399', text: 'Ticket #7291 auto-resolved by agent' },
];

// ────────────────────────────────────────────────
// Ops Controls toggle
// ────────────────────────────────────────────────
function Toggle({ checked, onChange }: Readonly<{ checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <button
      type="button"
      className={`od-toggle${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    />
  );
}

function healthLabel(status: string): string {
  if (status === 'healthy') return '100%';
  if (status === 'degraded') return 'Degraded';
  return 'Critical';
}

export function OmniDashLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [demoMode, setDemoMode] = useState(true);
  const [connectedEco, setConnectedEco] = useState(true);
  const [anonymizeKpis, setAnonymizeKpis] = useState(false);
  const [freezeMode, setFreezeMode] = useState(false);
  const [showEcoModal, setShowEcoModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<'sidebar' | 'widgets' | null>(null);
  const omniModal = useOmniModal();
  const openPiP = useOmniDashStore((s) => s.openPiP);

  const { isDark, toggleTheme } = useOmniTheme();
  const { traces, isTracing } = useOmniTrace();
  const health = useSystemHealth();

  // Real user initials from Supabase auth
  const [initials, setInitials] = useState('...');
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setInitials('?'); return; }
      const name = user.user_metadata?.full_name ?? user.email ?? '';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        setInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
      } else if (parts[0]) {
        setInitials(parts[0].slice(0, 2).toUpperCase());
      } else {
        setInitials('U');
      }
    });
  }, []);

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut(); }
    finally { navigate('/login'); }
  }, [navigate]);


  const activeNav = SIDEBAR_NAV.find(
    (n) => n.to === location.pathname || (n.to === '/omnidash' && location.pathname === '/omnidash'),
  )?.key ?? 'omniboard';

  // APEX Ecosystem — placeholder tiles only per user request

  return (
    <div className="omnidash-shell" data-theme={isDark ? 'dark' : 'light'}>
      {/* Mobile overlay for sidebar/widgets drawer */}
      {mobileMenuOpen && (
        <button type="button" className="mobile-overlay" onClick={() => setMobileMenuOpen(null)} aria-label="Close menu" />
      )}

      {/* ────── LEFT SIDEBAR ────── */}
      <aside className={`od-sidebar${mobileMenuOpen === 'sidebar' ? ' mobile-open' : ''}`}>
        <div className="od-sidebar-logo">
          <img src={apexWordmark} alt="APEX OmniHub" style={{ height: 26 }} />
        </div>

        <nav className="od-nav">
          {SIDEBAR_NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`od-nav-item${activeNav === item.key ? ' active' : ''}`}
            >
              <img src={item.icon} alt={item.label} className="nav-icon" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="od-sidebar-footer">
          <div className="od-sentry-status">
            <span className="od-sentry-dot" />{' '}
            <span>All Systems Operational</span>
          </div>
          <span>{'APEX Business Systems Ltd. \u00B7 OmniDash Platform'}</span>
          <button
            onClick={handleLogout}
            style={{
              display: 'block', marginTop: 8, fontSize: 13,
              color: 'var(--text-muted)', cursor: 'pointer', background: 'none',
              border: 'none', padding: 0, fontFamily: 'inherit',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ────── CENTER COLUMN ────── */}
      <div className="od-center">
        <header className="od-header">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="od-avatar mobile-only-btn"
            onClick={() => setMobileMenuOpen(p => p === 'sidebar' ? null : 'sidebar')}
            aria-label="Menu"
            id="mobile-hamburger"
          >
            <Menu style={{ width: 16, height: 16 }} />
          </button>
          <div className="od-header-search" style={{ flex: 1, maxWidth: 470 }}>
            <Search />
            <input
              type="search"
              placeholder="Search workflows, connectors, traces..."
            />
          </div>

          <div style={{ flex: 1 }} />

          <div className="od-header-actions">
            <button
              type="button"
              className="od-avatar"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
            </button>

            <div className="od-org-badge">
              APEX Business Systems
              <ChevronDown style={{ width: 12, height: 12 }} />
            </div>

            <div className="od-sentry-badge">
              <Shield style={{ width: 12, height: 12 }} />
              Zero Trust Active
            </div>

            <button type="button" onClick={(e) => {
              e.stopPropagation();
              omniModal.invoke({
              id: 'connect-ai',
              provider: 'APEX OmniPort',
              type: 'oauth',
              title: 'Connect AI Provider',
              description: 'Link your AI provider (OpenAI, Anthropic, or Google) for seamless agent integration.',
              onComplete: async (payload) => { console.warn('AI connected:', payload); navigate('/omnidash/omniport'); },
              onCancel: () => { console.warn('AI connect dismissed.'); },
            })
            }} className="od-connect-ai">Connect AI</button>

            <button type="button" className="od-avatar" aria-label="Notifications" onClick={(e) => {
              e.stopPropagation();
              omniModal.invoke({
              id: 'notifications',
              provider: 'APEX',
              type: 'selection',
              title: 'Notifications',
              description: 'Recent system notifications and alerts.',
              schema: { items: [
                { id: '1', label: 'Salesforce sync completed — 48 records updated' },
                { id: '2', label: 'Security scan passed — Zero Trust Active' },
                { id: '3', label: 'Invoice batch #1042 processed successfully' },
                { id: '4', label: 'Workflow "Lead Nurture" triggered by new lead' },
              ]},
              onComplete: async (payload) => { console.warn('Notification selected:', payload); },
              onCancel: () => { /* dismiss */ },
            })}}>
              <Bell style={{ width: 14, height: 14 }} />
            </button>

            <div className="od-avatar" title="User">
              {initials}
            </div>
          </div>
        </header>

        {/* ────── SPATIAL CANVAS (Layer 2) ────── */}
        <OmniCanvas>
          {/* Hero Bi-Pane: Agent + OmniSlate */}
          <WidgetShell widgetId={WIDGET_IDS.HERO} title="OmniSlate">
            <DashboardOverview />
          </WidgetShell>

          {/* Ops Controls */}
          <WidgetShell widgetId={WIDGET_IDS.OPS_CONTROLS} title="Ops Controls">
            <div style={{ padding: 12 }}>
              <div className="od-toggle-row"><span>Demo Mode</span><Toggle checked={demoMode} onChange={setDemoMode} /></div>
              <div className="od-toggle-row"><span>Connected Ecosystem</span><Toggle checked={connectedEco} onChange={setConnectedEco} /></div>
              <div className="od-toggle-row"><span>Anonymize KPIs</span><Toggle checked={anonymizeKpis} onChange={setAnonymizeKpis} /></div>
              <div className="od-toggle-row"><span>Freeze Mode</span><Toggle checked={freezeMode} onChange={setFreezeMode} /></div>
              <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {isTracing ? 'Syncing...' : `${String(traces.length)} events · Live`}
              </div>
            </div>
          </WidgetShell>

          {/* APEX Ecosystem */}
          <WidgetShell widgetId={WIDGET_IDS.ECOSYSTEM} title="APEX Ecosystem">
            <div className="eco-hex" style={{ border: 'none', borderRadius: 0 }}>
              {connectedEco ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tile-gap)' }}>
                    {/* Ecosystem mock tiles removed as per user request */}
                  </div>
                  <button type="button" className="more-apps-btn" onClick={() => setShowEcoModal(true)}>
                    More apps <ChevronRight size={14} />
                  </button>
                </>
              ) : (
                <button type="button" className="app-tile-add"
                  onClick={() => omniModal.invoke({
                    id: 'add-apex-app',
                    provider: 'APEX Ecosystem',
                    type: 'selection',
                    title: 'Add APEX App',
                    description: 'Select an app to connect to your APEX ecosystem.',
                    schema: { items: APP_REGISTRY.map(a => ({ id: a.key, label: a.label })) },
                    onComplete: async (payload) => { console.warn('App selected:', payload); setConnectedEco(true); },
                    onCancel: () => { console.warn('Add app dismissed.'); },
                  })}
                  style={{ cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 20 }}>+</span>{' '}
                  Add APEX App
                </button>
              )}
            </div>
          </WidgetShell>

          {/* OmniTrace */}
          <WidgetShell widgetId={WIDGET_IDS.OMNI_TRACE} title="OmniTrace">
            <div style={{ padding: 12 }}>
              {TRACE_FEED.map((item) => (
                <div key={item.text} className="od-trace-item">
                  <span className="od-trace-dot" style={{ background: item.color }} />
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{item.text}</span>
                </div>
              ))}
              <button type="button" className="od-scan-btn" style={{ marginTop: 12 }} onClick={() => omniModal.invoke({
                id: 'replay-workflows',
                provider: 'OmniTrace',
                type: 'confirmation',
                title: 'Replay Workflows',
                description: 'This will replay all recent workflow executions for analysis. Proceed?',
                onComplete: async () => { console.warn('Workflows replayed.'); },
                onCancel: () => { console.warn('Replay cancelled.'); },
              })}>✦ REPLAY WORKFLOWS</button>
            </div>
          </WidgetShell>

          {/* Analytics */}
          <WidgetShell widgetId={WIDGET_IDS.ANALYTICS} title="Analytics">
            <div style={{ padding: 12 }}>
              <div className="od-metric-grid">
                <div className="od-metric-cube">
                  <div className="od-metric-value">{String(traces.length)}</div>
                  <div className="od-metric-label">Events Tracked</div>
                </div>
                <div className="od-metric-cube">
                  <div className="od-metric-value" style={{ color: health.status === 'healthy' ? 'var(--health-green)' : 'var(--health-yellow)' }}>{healthLabel(health.status)}</div>
                  <div className="od-metric-label">System Health</div>
                </div>
                <div className="od-metric-cube">
                  <div className="od-metric-value" style={{ color: 'var(--accent)' }}>{health.loopStatuses.length > 0 ? `${String(health.loopStatuses.length)} loops` : '—'}</div>
                  <div className="od-metric-label">Guardian Loops</div>
                </div>
                <div className="od-metric-cube">
                  <div className="od-metric-value" style={{ color: health.status === 'healthy' ? 'var(--health-green)' : 'var(--health-yellow)' }}>{health.loopStatuses.filter(s => s.status === 'stale').length === 0 ? 'Clean' : `${String(health.loopStatuses.filter(s => s.status === 'stale').length)} stale`}</div>
                  <div className="od-metric-label">Stale Checks</div>
                </div>
              </div>
            </div>
          </WidgetShell>

          {/* Security Audit */}
          <WidgetShell widgetId={WIDGET_IDS.SECURITY} title="Security Audit">
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Shield style={{ width: 20, height: 20, color: health.status === 'healthy' ? 'var(--health-green)' : 'var(--health-yellow)' }} />
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-heading)' }}>{health.status === 'healthy' ? 'Zero Trust Active' : 'System Alert'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{health.status === 'healthy' ? 'All gateways secured' : `${String(health.loopStatuses.filter(s => s.status === 'stale').length)} stale loop(s) detected`}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                LAST CHECK: {health.lastChecked.toLocaleTimeString('en-US', { timeZone: 'America/Edmonton' })}
              </div>
              <button type="button" className="od-scan-btn" onClick={() => omniModal.invoke({
                id: 'security-scan',
                provider: 'Fortress',
                type: 'confirmation',
                title: 'Security Scan',
                description: 'Initiate a full zero-trust security audit across all connected systems. This process is non-destructive.',
                onComplete: async () => { console.warn('Security scan initiated.'); },
                onCancel: () => { console.warn('Security scan cancelled.'); },
              })}>
                <Scan style={{ width: 12, height: 12 }} /> Scan Now
              </button>
            </div>
          </WidgetShell>

          {/* Integrated Apps */}
          <WidgetShell widgetId={WIDGET_IDS.INTEGRATED_APPS} title="Integrated Apps" chromeless>
            <Outlet />
          </WidgetShell>
        </OmniCanvas>
      </div>

      {/* ────── APEX ECOSYSTEM OVERFLOW MODAL ────── */}
      {showEcoModal && (
        <div className="od-modal-overlay">
          <button
            type="button"
            className="od-modal-backdrop"
            onClick={() => setShowEcoModal(false)}
            aria-label="Close modal"
            style={{ position: 'absolute', inset: 0, background: 'transparent', border: 'none', cursor: 'default' }}
          />
          <dialog
            open
            className="od-modal-content"
            style={{ maxWidth: 700, padding: 32 }}
          >
            <button
              type="button"
              className="od-modal-close"
              onClick={() => setShowEcoModal(false)}
            >
              <X size={20} />
            </button>
            <div style={{ padding: 32 }}>
              <div className="eco-section-title" style={{ fontSize: 20, marginBottom: 20 }}>APEX Ecosystem</div>
              <div className="integrated-grid">
                {/* Ecosystem mock overflow tiles removed as per user request */}
              </div>
            </div>
          </dialog>
        </div>
      )}

      {/* ────── GLOBAL OMNIMODAL ENGINE (Unified Spatial Host) ────── */}
      <OmniSpatialHost />

      {/* ────── PiP FLOATING WINDOWS (Layer 5) ────── */}
      <FloatingWindowRenderer />

      {/* ────── MOBILE BOTTOM NAV ────── */}
      <nav className="mobile-bottom-nav">
        <button type="button" className="active" onClick={() => { setMobileMenuOpen(null); navigate('/omnidash'); }}>
          <LayoutGrid size={20} />
          <span>Home</span>
        </button>
        <button type="button" onClick={() => setMobileMenuOpen(p => p === 'sidebar' ? null : 'sidebar')}>
          <Menu size={20} />
          <span>Apps</span>
        </button>
        <button type="button" onClick={() => openPiP('widgets', 'Workspace Widgets')}>
          <Zap size={20} />
          <span>Widgets</span>
        </button>
        <button type="button" onClick={() => navigate('/omnidash/settings')}>
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
