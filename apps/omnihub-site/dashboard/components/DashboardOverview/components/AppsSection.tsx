import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FONT_SG } from '../constants';
import { APPS } from '../data';
import type { AppEntry } from '../types';
import { AppTile } from './AppTile';
import { useOmniDashAction } from '@/hooks/useOmniDashAction';

interface AppsSectionProps {
  readonly onAppClick: (app: AppEntry) => () => void;
}

export const AppsSection = memo(function AppsSection({
  onAppClick,
}: AppsSectionProps) {
  const navigate = useNavigate();
  const { dispatch } = useOmniDashAction(navigate);

  return (
    <div className="apex-apps-section apps-hex">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: '#e8ecf4',
              letterSpacing: '-0.02em',
            }}
          >
            Integrated Apps
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#5a6478',
              fontFamily: FONT_SG,
              letterSpacing: '0.06em',
            }}
          >
            ALL SYSTEMS ({APPS.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() => dispatch({
            source: 'module',
            appKey: 'settings',
            provider: 'Settings',
            label: 'Settings',
            category: 'control-plane',
            routePath: '/omnidash/settings',
            dashboardStatus: 'Live',
          })}
          style={{
            fontSize: 11,
            color: '#f97316',
            cursor: 'pointer',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: 'none',
            border: 'none',
            fontFamily: 'inherit',
            padding: 0,
            transition: 'opacity 0.2s',
          }}
        >
          Manage \u2192
        </button>
      </div>

      <div className="apex-apps-row">
        {APPS.map(app => (
          <AppTile
            key={app.name}
            app={app}
            onClick={onAppClick(app)}
          />
        ))}
      </div>
    </div>
  );
});
