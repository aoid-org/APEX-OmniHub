import { memo } from 'react';
import { FONT_SG } from '../constants';
import { APPS } from '../data';
import type { AppEntry } from '../types';
import { AppTile } from './AppTile';

interface AppsSectionProps {
  readonly onAppClick: (app: AppEntry) => () => void;
}

export const AppsSection = memo(function AppsSection({
  onAppClick,
}: AppsSectionProps) {
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
          style={{ display: 'flex', alignItems: 'center', gap: 16 }}
        >
          <span
            style={{
              fontSize: 19.26,
              fontWeight: 800,
              color: '#dfe6fe',
              letterSpacing: '-0.02em',
            }}
          >
            Integrated Apps
          </span>
          <span
            style={{
              fontSize: 12.84,
              fontWeight: 700,
              color: '#a1a1aa',
              fontFamily: FONT_SG,
            }}
          >
            ALL SYSTEMS ({APPS.length})
          </span>
        </div>
        <span
          style={{
            fontSize: 12.84,
            color: '#f97316',
            cursor: 'pointer',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Manage →
        </span>
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
