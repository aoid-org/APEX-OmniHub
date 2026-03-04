/**
 * APEX OmniDash Layout — v1.4.2 Unified Apple-Grade Shell
 * @version 1.4.2 — Theme system, APEX Ecosystem widget, glassmorphism, drag-reorder
 *
 * 3-column CSS Grid: 260px | 1fr | 320px
 * Custom APEX-branded 3D nav icons
 * Theme-aware via data-theme attribute
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, Bell, Shield, ChevronDown, Scan, Sun, Moon, X, ChevronRight, Menu, LayoutGrid, Zap, Settings } from 'lucide-react';
import { DashboardOverview } from '@/pages/DashboardOverview';
import { UniversalModalEngine } from '../../../../src/components/omnidash/media/UniversalModalEngine';
import { useOmniModal } from '../../../../src/stores/omniModalStore';
import { Reorder } from 'framer-motion';
import '@/styles/omnidash-layout.css';

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

const SIDEBAR_NAV = APP_REGISTRY.map((entry: AppRegistryEntry) => ({
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

const LOGO = (domain: string) => `https://logo.clearbit.com/${domain}`;

// Widget IDs for reordering
type WidgetId = 'ops' | 'ecosystem' | 'trace' | 'analytics' | 'security';

const STORAGE_KEY_THEME = 'apex-theme';
const STORAGE_KEY_WIDGET_ORDER = 'apex-widget-order';

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

  // Theme state — persisted to localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return saved ? saved === 'dark' : true;
  });

  // Widget reorder state — persisted to localStorage
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WIDGET_ORDER);
    if (saved) {
      try { return JSON.parse(saved) as WidgetId[]; } catch { /* fallback */ }
    }
    return ['ops', 'ecosystem', 'trace', 'analytics', 'security'];
  });

  // Persist theme
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Persist widget order
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WIDGET_ORDER, JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut(); }
    finally { navigate('/login'); }
  }, [navigate]);

  const initials = useMemo(() => 'JR', []);

  const activeNav = SIDEBAR_NAV.find(
    (n) => n.to === location.pathname || (n.to === '/omnidash' && location.pathname === '/omnidash'),
  )?.key ?? 'omniboard';

  // APEX Ecosystem — first 3 visible, rest in modal
  const ecoAppsVisible = useMemo(() => APP_REGISTRY.slice(0, 3), []);
  const ecoAppsOverflow = useMemo(() => APP_REGISTRY.slice(3), []);

  // ────────────────────────────────────────────────
  // Widget Renderers
  // ────────────────────────────────────────────────
  const renderWidget = useCallback((id: WidgetId) => {
    switch (id) {
      case 'ops':
        return (
          <div className="glass" key="ops">
            <div className="od-card-title">Ops Controls</div>
            <div className="od-toggle-row"><span>Demo Mode</span><Toggle checked={demoMode} onChange={setDemoMode} /></div>
            <div className="od-toggle-row"><span>Connected Ecosystem</span><Toggle checked={connectedEco} onChange={setConnectedEco} /></div>
            <div className="od-toggle-row"><span>Anonymize KPIs</span><Toggle checked={anonymizeKpis} onChange={setAnonymizeKpis} /></div>
            <div className="od-toggle-row"><span>Freeze Mode</span><Toggle checked={freezeMode} onChange={setFreezeMode} /></div>
            <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Running 24 tasks · 96.8% success
            </div>
          </div>
        );

      case 'ecosystem':
        return (
          <div className="eco-hex" key="ecosystem">
            <div className="eco-section-title">APEX Ecosystem</div>
            {connectedEco ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tile-gap)' }}>
                  {ecoAppsVisible.map((app) => (
                    <div className="app-tile" key={app.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => omniModal.invoke({
                        id: `eco-${app.key}`,
                        provider: app.label,
                        type: 'oauth',
                        title: `${app.label} Connection`,
                        description: `Configure ${app.label} integration for ${app.category} data synchronization.`,
                        onComplete: async (payload) => {
                          console.warn(`${app.label} configured:`, payload);
                        },
                        onCancel: () => {
                          console.warn(`${app.label} config dismissed.`);
                        },
                      })}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={LOGO(app.logoDomain)}
                        alt={app.label}
                        className="app-tile-icon"
                      />
                      <div className="app-tile-info">
                        <div className="app-tile-name">{app.label}</div>
                        <div className="app-tile-cat">{app.category}</div>
                      </div>
                      <span className={`health-dot health-dot-${app.healthContext.health}`} />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="more-apps-btn"
                  onClick={() => setShowEcoModal(true)}
                >
                  More apps <ChevronRight size={14} />
                </button>
              </>
            ) : (
              <div className="app-tile-add"
                role="button"
                tabIndex={0}
                onClick={() => omniModal.invoke({
                  id: 'add-apex-app',
                  provider: 'APEX Ecosystem',
                  type: 'selection',
                  title: 'Add APEX App',
                  description: 'Select an app to connect to your APEX ecosystem.',
                  schema: { items: APP_REGISTRY.map(a => ({ id: a.key, label: a.label })) },
                  onComplete: async (payload) => {
                    console.warn('App selected:', payload);
                    setConnectedEco(true);
                  },
                  onCancel: () => {
                    console.warn('Add app dismissed.');
                  },
                })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                style={{ cursor: 'pointer' }}
              >
                <span style={{ fontSize: 20 }}>+</span>
                Add APEX App
              </div>
            )}
          </div>
        );

      case 'trace':
        return (
          <div className="glass" key="trace">
            <div className="od-card-title">OmniTrace</div>
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
        );

      case 'analytics':
        return (
          <div className="glass" key="analytics">
            <div className="od-card-title">Analytics</div>
            <div className="od-metric-grid">
              <div className="od-metric-cube">
                <div className="od-metric-value">27/50</div>
                <div className="od-metric-label">Tasks Today</div>
              </div>
              <div className="od-metric-cube">
                <div className="od-metric-value" style={{ color: 'var(--health-green)' }}>96.8%</div>
                <div className="od-metric-label">Success Rate</div>
              </div>
              <div className="od-metric-cube">
                <div className="od-metric-value" style={{ color: 'var(--accent)' }}>842ms</div>
                <div className="od-metric-label">Avg. Latency</div>
              </div>
              <div className="od-metric-cube">
                <div className="od-metric-value" style={{ color: 'var(--health-green)' }}>$3,240</div>
                <div className="od-metric-label">Cost Saved</div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="glass" key="security">
            <div className="od-card-title">Security Audit</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Shield style={{ width: 20, height: 20, color: 'var(--health-green)' }} />
              <div>
                <div style={{ fontSize: 14, color: 'var(--text-heading)' }}>Zero Trust Active</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>All gateways secured</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              LAST SCAN: 12 MIN AGO
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
        );

      default:
        return null;
    }
  }, [demoMode, connectedEco, anonymizeKpis, freezeMode, ecoAppsVisible, omniModal]);

  return (
    <div className="omnidash-shell" data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Mobile overlay for sidebar/widgets drawer */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" role="button" tabIndex={0} onClick={() => setMobileMenuOpen(null)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { setMobileMenuOpen(null); } }} aria-label="Close menu" />
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
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
            </button>

            <div className="od-org-badge">
              APEX Business Systems
              <ChevronDown style={{ width: 12, height: 12 }} />
            </div>

            <div className="od-sentry-badge">
              <Shield style={{ width: 12, height: 12 }} />
              Zero Trust Active
            </div>

            <button type="button" onClick={() => omniModal.invoke({
              id: 'connect-ai',
              provider: 'APEX OmniPort',
              type: 'oauth',
              title: 'Connect AI Provider',
              description: 'Link your AI provider (OpenAI, Anthropic, or Google) for seamless agent integration.',
              onComplete: async (payload) => { console.warn('AI connected:', payload); navigate('/omnidash/omniport'); },
              onCancel: () => { console.warn('AI connect dismissed.'); },
            })} className="od-connect-ai">Connect AI</button>

            <button type="button" className="od-avatar" aria-label="Notifications" onClick={() => omniModal.invoke({
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
            })}>
              <Bell style={{ width: 14, height: 14 }} />
            </button>

            <div className="od-avatar" title="User">
              {initials}
            </div>
          </div>
        </header>

        <div className={`od-content ${location.pathname === '/omnidash' ? '' : 'center-content-blur'}`}>
          <DashboardOverview />
        </div>

        {/* ────── UNIVERSAL SPA MODAL ────── */}
        {location.pathname !== '/omnidash' && (
          <div className="od-modal-overlay">
            <div className="od-modal-content hex-outer">
              <button
                type="button"
                className="od-modal-close"
                onClick={() => navigate('/omnidash')}
              >
                <X size={20} />
              </button>

              <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
                <Outlet />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────── RIGHT SIDEBAR (Reorderable Widgets) ────── */}
      <aside className={`od-right${mobileMenuOpen === 'widgets' ? ' mobile-open' : ''}`}>
        <Reorder.Group
          axis="y"
          values={widgetOrder}
          onReorder={setWidgetOrder}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}
        >
          {widgetOrder.map((id) => (
            <Reorder.Item
              key={id}
              value={id}
              style={{ cursor: 'grab' }}
              whileDrag={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', zIndex: 10 }}
            >
              {renderWidget(id)}
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </aside>

      {/* ────── APEX ECOSYSTEM OVERFLOW MODAL ────── */}
      {showEcoModal && (
        <div className="od-modal-overlay" role="button" tabIndex={0} onClick={() => setShowEcoModal(false)} onKeyDown={(e) => { if (e.key === 'Escape') { setShowEcoModal(false); } }} aria-label="Close modal">
          <div
            className="od-modal-content"
            style={{ maxWidth: 700, padding: 32 }}
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
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
                {ecoAppsOverflow.map((app) => (
                  <div className="app-tile" key={app.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => omniModal.invoke({
                      id: `overflow-eco-${app.key}`,
                      provider: app.label,
                      type: 'oauth',
                      title: `${app.label} Connection`,
                      description: `Configure ${app.label} integration for ${app.category} data synchronization.`,
                      onComplete: async (payload) => {
                        console.warn(`${app.label} configured:`, payload);
                        setShowEcoModal(false);
                      },
                      onCancel: () => {
                        console.warn(`${app.label} dismissed.`);
                      },
                    })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={LOGO(app.logoDomain)}
                      alt={app.label}
                      className="app-tile-icon"
                    />
                    <div className="app-tile-info">
                      <div className="app-tile-name">{app.label}</div>
                      <div className="app-tile-cat">{app.category}</div>
                    </div>
                    <span className={`health-dot health-dot-${app.healthContext.health}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────── GLOBAL MODAL ENGINE ────── */}
      <UniversalModalEngine />

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
        <button type="button" onClick={() => setMobileMenuOpen(p => p === 'widgets' ? null : 'widgets')}>
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
