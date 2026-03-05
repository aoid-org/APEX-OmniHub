/**
 * APEX OmniDash Layout - apps/omnihub-site
 * @version 6.0.0 - Custom nav icons, Space Grotesk font, burnt orange accents
 *
 * 2-column CSS Grid: 260px | 1fr
 * Custom APEX-branded 3D nav icons (no Lucide in sidebar)
 * Lucide kept only for header utility icons (Search, Bell, Shield, ChevronDown)
 */

import { useState, useMemo, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, Bell, Shield, ChevronDown, Sun, Moon, X } from 'lucide-react';
import { DashboardOverview } from '@/pages/DashboardOverview';
import { UniversalModalEngine } from '../../../../src/components/omnidash/media/UniversalModalEngine';
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

export function OmniDashLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const simModeSchema = z.enum(['true', 'false']);
  const simModeParam = searchParams.get('sim_mode');
  const demoMode = simModeSchema.safeParse(simModeParam).success
    ? simModeParam === 'true'
    : false;
  const [ecoAppsVisible, setEcoAppsVisible] = useState(false);
  const [appHealth, setAppHealth] = useState<'green' | 'yellow' | 'red'>('green');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut(); }
    finally { navigate('/login'); }
  }, [navigate]);

  const initials = useMemo(() => 'JR', []);

  const activeNav = SIDEBAR_NAV.find(
    (n) => n.to === location.pathname || (n.to === '/omnidash' && location.pathname === '/omnidash'),
  )?.key ?? 'omniboard';

  return (
    <div className="omnidash-shell">
      {/* ────── LEFT SIDEBAR ────── */}
      <aside className="od-sidebar">
        <div className="od-sidebar-logo">
          <img src={apexWordmark} alt="APEX OmniHub" style={{ height: 26 }} />
        </div>

        <nav className="od-nav">
          {SIDEBAR_NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`od-nav-item transition-all duration-300 ease-out hover:translate-x-1 ${activeNav === item.key ? ' active' : ''}`}
            >
              <img src={item.icon} alt={item.label} className="nav-icon drop-shadow-md" />
              <span className="font-bold tracking-tight">{item.label}</span>
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
              display: 'block', marginTop: 8, fontSize: 13.375,
              color: '#64748b', cursor: 'pointer', background: 'none',
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

            <button type="button" onClick={() => navigate('/omnidash/omniport')} className="od-connect-ai">Connect AI</button>

            <button type="button" className="od-avatar" aria-label="Notifications">
              <Bell className="h-3.5 w-3.5" />
            </button>

            <div className="od-avatar" title="User">
              {initials}
            </div>
          </div>
        </header>

        <div className={`od-content ${location.pathname === '/omnidash' ? '' : 'center-content-blur'}`}>
          {/* Dashboard is PERMANENT in the background */}
          <DashboardOverview
            demoMode={demoMode}
            appHealth={appHealth}
            setAppHealth={setAppHealth}
            ecoAppsVisible={ecoAppsVisible}
            setEcoAppsVisible={setEcoAppsVisible}
          />
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



      {/* ────── GLOBAL MODAL ENGINE ────── */}
      <UniversalModalEngine />
    </div>
  );
}
