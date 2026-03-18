import { memo, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Blocks } from 'lucide-react';
import { useOmniDash } from '@/stores/omniDashStore';
import {
  FONT_SG,
  APP_TILE_SURFACE,
  APP_LOGO_STYLE,
  APP_LOGO_FALLBACK,
  APP_TILE_HOVER,
  PARTIAL_CHIP,
  SYNC_BTN_STYLE,
} from '../constants';
import type { AppEntry } from '../types';

interface AppTileProps {
  readonly app: AppEntry;
  readonly onClick: () => void;
}

export const AppTile = memo(function AppTile({ app, onClick }: AppTileProps) {
  const isPartial = app.status === 'Partial';
  const chipPos = { position: 'absolute' as const, top: 14, right: 14 };
  const chipStyle = isPartial
    ? { ...chipPos, ...PARTIAL_CHIP }
    : chipPos;

  const widgetId = `app-tile-${app.name.toLowerCase().replace(/\s+/g, '-')}`;
  const canvasRef = useRef<HTMLDivElement>(null);

  const { openWidget, moveWidget, focusWidget } = useOmniDash();
  const widgetState = useOmniDash(s => s.widgets.get(widgetId));

  const x = useMotionValue(widgetState?.position.x ?? 0);
  const y = useMotionValue(widgetState?.position.y ?? 0);

  // Register with omniDashStore on mount
  useEffect(() => {
    openWidget(widgetId, app.name, 'appTile', { x: 0, y: 0 }, { width: 280, height: 80 });
  }, [widgetId, app.name, openWidget]);

  // Sync motion values from store when store position changes
  useEffect(() => {
    if (widgetState) {
      x.set(widgetState.position.x);
      y.set(widgetState.position.y);
    }
  }, [widgetState?.position.x, widgetState?.position.y, x, y]);

  return (
    <div ref={canvasRef} style={{ position: 'relative' }}>
      <motion.div
        className="apex-app-tile"
        style={{
          ...APP_TILE_SURFACE,
          x,
          y,
          zIndex: widgetState?.zIndex ?? 100,
          touchAction: 'none',
        }}
        drag
        dragMomentum={false}
        dragConstraints={canvasRef}
        onPointerDown={() => focusWidget(widgetId)}
        onDragEnd={() => moveWidget(widgetId, { x: x.get(), y: y.get() })}
        whileHover={APP_TILE_HOVER}
        whileDrag={{ scale: 1.04, cursor: 'grabbing' }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
      >
        {app.logo ? (
          <img src={app.logo} alt={app.name} style={APP_LOGO_STYLE} />
        ) : (
          <div style={APP_LOGO_FALLBACK}>
            <Blocks size={20} strokeWidth={2.5} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#e8ecf4',
                letterSpacing: '-0.01em',
              }}
            >
              {app.name}
            </span>
            <span className="chip-live" style={chipStyle}>
              {app.status}
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#7a849a',
              marginTop: 3,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {app.cat}
          </div>
          {app.synced && (
            <div
              style={{
                fontSize: 10,
                color: '#5a6478',
                marginTop: 2,
                fontFamily: FONT_SG,
                letterSpacing: '0.02em',
              }}
            >
              SYNC: {app.synced}
            </div>
          )}
        </div>
        {isPartial && (
          <button type="button" style={SYNC_BTN_STYLE}>
            Sync
          </button>
        )}
      </motion.div>
    </div>
  );
});
