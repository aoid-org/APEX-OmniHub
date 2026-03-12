/**
 * APEX OmniDash Layout - apps/omnihub-site
 * @version 7.0.0 - OmniCanvas spatial windowing + custom nav icons
 *
 * 3-column Flexbox: 260px sidebar | 1fr canvas | 280px right sidebar
 * OmniSkills appears in HEADER only (not sidebar, not app grid).
 * Right sidebar: SentinelPanel (OmniTrace, Security Audit, Analytics, Ops)
 * Custom APEX-branded 3D nav icons (no Lucide in sidebar)
 * Lucide kept only for header utility icons (Search, Bell, Shield, ChevronDown)
 */

import { useState, useMemo, useCallback, type MouseEvent } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, Bell, Shield, ChevronDown, Sun, Moon, X, Sparkles } from 'lucide-react';
import { DashboardOverview } from '@/pages/DashboardOverview';
import { OmniCanvas } from '@/components/omnidash/OmniCanvas';
import { OmniSpatialHost } from '@/components/omnidash/OmniSpatialHost';
import { GlobalMediaDock } from '@/components/omnidash/media/GlobalMediaDock';
import { BYOMCockpit } from '@/components/byom/BYOMCockpit';
import { SentinelPanel } from '@/components/omnidash/SentinelPanel';
import { useOmniDashAction, type OmniDashIntent } from '@/hooks/useOmniDashAction';
import { useOmniModal } from '@/stores/omniModalStore';
import { hasModuleComponent } from '../components/omnidash/moduleComponents';
import '@/styles/omnidash-layout.css';
import { z } from 'zod';

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
// OmniSkills is EXCLUDED from sidebar — it appears in header only
// ────────────────────────────────────────────────
const NAV_ICON_MAP: Readonly<Record<string, string>> = {
  omniboard: navOmniboard,
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

/** Keys excluded from sidebar nav (OmniSkills is header-only) */
const SIDEBAR_EXCLUDED = new Set(['omniskills']);

const SIDEBAR_NAV = APP_REGISTRY
  .filter((entry: AppRegistryEntry) => !SIDEBAR_EXCLUDED.has(entry.key))
  .map((entry: AppRegistryEntry) => ({
    key: entry.key,
    label: entry.label,
    icon: NAV_ICON_MAP[entry.iconAssetKey] ?? navOmniboard,
    to: entry.routePath,
    category: entry.category,
  }));

export function OmniDashLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useOmniDashAction((path) => navigate(path));
  const invokeModal = useOmniModal((state) => state.invoke);
  const [searchParams] = useSearchParams();

  const simModeStateSchema = z.object({
    sim_mode: z.enum(['true', 'false']).default('false'),
  });
  const demoMode = simModeStateSchema.parse({
    sim_mode: searchParams.get('sim_mode') ?? 'false',
  }).sim_mode === 'true';
  const [ecoAppsVisible, setEcoAppsVisible] = useState(false);
  const [appHealth, setAppHealth] = useState<'green' | 'yellow' | 'red'>('green');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut(); }
    finally { navigate('/login'); }
  }, [navigate]);

  const initials = useMemo(() => 'JR', []);

  const isDashboardRootRoute = location.pathname === '/omnidash' || location.pathname === '/dashboard';

  const activeNav = SIDEBAR_NAV.find(
    (n) => n.to === location.pathname || (n.to === '/omnidash' && isDashboardRootRoute),
  )?.key ?? 'omniboard';

  const handleOmniSkillsClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const intent: OmniDashIntent = {
      appKey: 'omniskills',
      provider: 'OmniSkills',
      label: 'OmniSkills',
      category: 'platform',
      routePath: '/omnidash/omniskills',
      dashboardStatus: 'Live',
    };
    dispatch(intent);
  }, [dispatch]);

  return (
    <div className="omnidash-shell">
      {/* ────── LEFT SIDEBAR ────── */}
      <aside className="od-sidebar">
        <div className="od-sidebar-logo">
          <img src={apexWordmark} alt="APEX OmniHub" style={{ height: 26 }} />
        </div>

        <nav className="od-nav">
          {SIDEBAR_NAV.map((item) => {
            const hasModule = hasModuleComponent(item.key);
            if (hasModule) {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`od-nav-item transition-all duration-300 ease-out hover:translate-x-1 ${activeNav === item.key ? ' active' : ''}`}
                  onClick={() => {
                    const intent: OmniDashIntent = {
                      appKey: item.key,
                      provider: item.label,
                      label: item.label,
                      category: item.category,
                      routePath: item.to,
                      dashboardStatus: 'Live',
                    };
                    dispatch(intent);
                  }}
                >
                  <img src={item.icon} alt={item.label} className="nav-icon drop-shadow-md" />
                  <span className="font-bold tracking-tight">{item.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`od-nav-item transition-all duration-300 ease-out hover:translate-x-1 ${activeNav === item.key ? ' active' : ''}`}
              >
                <img src={item.icon} alt={item.label} className="nav-icon drop-shadow-md" />
                <span className="font-bold tracking-tight">{item.label}</span>
              </Link>
            );
          })}
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
              display: 'block', marginTop: 8, fontSize: 11,
              color: '#5a6478', cursor: 'pointer', background: 'none',
              border: 'none', padding: 0, fontFamily: 'inherit',
              fontWeight: 600, letterSpacing: '0.03em',
              transition: 'color 0.2s',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ────── CENTER COLUMN ────── */}
      <div className="od-center">
        <header className="od-header">
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
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="od-org-badge">
              APEX Business Systems
              <ChevronDown className="h-3 w-3" />
            </div>

            <div className="od-sentry-badge">
              <Shield className="h-3 w-3" />
              Zero Trust Active
            </div>

            {/* OmniSkills — header-only access */}
            <button
              type="button"
              className="od-omniskills-btn"
              onClick={handleOmniSkillsClick}
              title="OmniSkills"
            >
              <Sparkles className="h-3.5 w-3.5" />
              OmniSkills
            </button>

            <button type="button" onClick={(e: MouseEvent) => {
              e.stopPropagation();
              dispatch({
                appKey: 'omniport',
                provider: 'APEX OmniPort',
                label: 'APEX OmniPort',
                category: 'platform',
                routePath: '/omnidash/omniport',
                dashboardStatus: 'Partial',
              });
            }} className="od-connect-ai">Connect AI</button>

            <button type="button" className="od-avatar" aria-label="Notifications" onClick={(e: MouseEvent) => {
              e.stopPropagation();
              invokeModal({
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
              });
            }}>
              <Bell className="h-3.5 w-3.5" />
            </button>

            <div className="od-avatar" title="User">
              {initials}
            </div>
          </div>
        </header>

        <div className={`od-content ${isDashboardRootRoute ? '' : 'center-content-blur'}`}>
          {/* Dashboard + OmniCanvas spatial layer */}
          <DashboardOverview
            demoMode={demoMode}
            appHealth={appHealth}
            setAppHealth={setAppHealth}
            ecoAppsVisible={ecoAppsVisible}
            setEcoAppsVisible={setEcoAppsVisible}
          />
          <OmniCanvas />
        </div>

        {/* ────── UNIVERSAL SPA MODAL ────── */}
        {!isDashboardRootRoute && (
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

      {/* ────── RIGHT SIDEBAR: Sentinel Intel Panel ────── */}
      <aside className="od-right-sidebar">
        <SentinelPanel />
        <div className="sentinel-section">
          <BYOMCockpit />
        </div>
      </aside>

      {/* ────── GLOBAL MODAL ENGINE ────── */}
      <OmniSpatialHost />
      <GlobalMediaDock />
    </div>
  );
}
